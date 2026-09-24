/**
 * PVGIS connector.
 *
 * PVGIS publishes the radiation database that actually covers this region
 * (SARAH3) and will return a typical meteorological year for any coordinate.
 * Two things to know before wiring it up:
 *
 *  1. PVGIS states that browser AJAX access is not allowed, so in the browser
 *     every call goes through our own proxy path. In Node (the bake script) it
 *     is called directly.
 *  2. It is rate limited to 30 requests a second and can answer 529 when busy,
 *     so results are cached to disk and shipped with the build.
 */

import { HOURS_PER_YEAR, newSeries, type LatLng } from "../engine/types";
import type { WeatherYear } from "../engine/solar";

export const PVGIS_BASE = "https://re.jrc.ec.europa.eu/api/v5_3";
export const PVGIS_ATTRIBUTION = {
  kind: "dataset" as const,
  label: "PVGIS SARAH3 TMY",
  url: "https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en",
};

/** Where browser calls are sent. A Worker or serverless function forwards them. */
export const PVGIS_PROXY_PATH = "/api/pvgis";

const isBrowser = typeof window !== "undefined";

const endpoint = (path: string, params: Record<string, string | number>): string => {
  const query = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  ).toString();
  return isBrowser ? `${PVGIS_PROXY_PATH}/${path}?${query}` : `${PVGIS_BASE}/${path}?${query}`;
};

export type TmyResponse = {
  outputs: {
    tmy_hourly: {
      "time(UTC)": string;
      "G(h)": number;
      "Gb(n)": number;
      "Gd(h)": number;
      T2m: number;
      WS10m: number;
    }[];
  };
  inputs: unknown;
  meta?: unknown;
};

/**
 * Fetch a typical meteorological year and reshape it into the engine's hourly
 * series. PVGIS returns UTC timestamps; the UAE is UTC+4 with no daylight
 * saving, so the series is rotated by four hours into local standard time.
 */
export const fetchTmy = async (site: LatLng, fetchImpl: typeof fetch = fetch): Promise<WeatherYear> => {
  const url = endpoint("tmy", {
    lat: site.lat,
    lon: site.lng,
    outputformat: "json",
    usehorizon: 1,
  });

  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`PVGIS returned ${response.status} for ${site.lat},${site.lng}`);
  }
  const payload = (await response.json()) as TmyResponse;
  return tmyToWeatherYear(payload);
};

export const tmyToWeatherYear = (payload: TmyResponse, utcOffsetHours = 4): WeatherYear => {
  const rows = payload.outputs?.tmy_hourly ?? [];
  if (rows.length < HOURS_PER_YEAR) {
    throw new Error(`PVGIS TMY returned ${rows.length} hours, expected ${HOURS_PER_YEAR}`);
  }

  const ghi = newSeries();
  const ambientC = newSeries();
  const windMs = newSeries();

  for (let index = 0; index < HOURS_PER_YEAR; index += 1) {
    const localIndex = (index + utcOffsetHours) % HOURS_PER_YEAR;
    const row = rows[index];
    ghi[localIndex] = row["G(h)"];
    ambientC[localIndex] = row.T2m;
    windMs[localIndex] = row.WS10m;
  }

  return { ghi, ambientC, windMs, source: "pvgis-tmy" };
};

/** Compact form for shipping a cached year inside the bundle. */
export type WeatherSnapshot = {
  id: string;
  label: string;
  location: LatLng;
  source: WeatherYear["source"];
  retrievedAt: string;
  /** Rounded to one decimal to keep the file small; the loss is immaterial. */
  ghi: number[];
  ambientC: number[];
  windMs: number[];
};

export const toSnapshot = (
  id: string,
  label: string,
  location: LatLng,
  weather: WeatherYear,
): WeatherSnapshot => ({
  id,
  label,
  location,
  source: weather.source,
  retrievedAt: new Date().toISOString().slice(0, 10),
  ghi: Array.from(weather.ghi, (value) => Math.round(value * 10) / 10),
  ambientC: Array.from(weather.ambientC, (value) => Math.round(value * 10) / 10),
  windMs: Array.from(weather.windMs, (value) => Math.round(value * 10) / 10),
});

export const fromSnapshot = (snapshot: WeatherSnapshot): WeatherYear => ({
  ghi: Float64Array.from(snapshot.ghi),
  ambientC: Float64Array.from(snapshot.ambientC),
  windMs: Float64Array.from(snapshot.windMs),
  source: snapshot.source,
});
