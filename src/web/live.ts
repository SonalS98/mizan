/**
 * Live lookups: search an address, then pull the real buildings around it.
 *
 * These call the public OpenStreetMap services directly. They work wherever
 * the page is allowed to make cross-origin requests, which means localhost and
 * a normal deployment. Inside a Claude artifact they are blocked, so the caller
 * treats a failure as "search unavailable" and falls back to the areas that
 * were baked into the build.
 */

import { polygonAreaM2, type PolygonM } from "../engine/packing";
import type { Scene } from "./map";

export type Place = { label: string; lat: number; lng: number };

export const searchPlaces = async (query: string): Promise<Place[]> => {
  const params = new URLSearchParams({ q: query, format: "jsonv2", countrycodes: "ae", limit: "6" });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Search returned ${response.status}`);
  const payload = (await response.json()) as { display_name: string; lat: string; lon: string }[];
  return payload.map((item) => ({
    label: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
  }));
};

const OVERPASS = "https://overpass-api.de/api/interpreter";

const simplify = (points: [number, number][], tolerance: number): [number, number][] => {
  if (points.length < 3) return points;
  const perpendicular = (p: [number, number], a: [number, number], b: [number, number]) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length = Math.hypot(dx, dy);
    if (length < 1e-6) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    return Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / length;
  };
  let index = 0;
  let largest = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicular(points[i], points[0], points[points.length - 1]);
    if (distance > largest) {
      largest = distance;
      index = i;
    }
  }
  if (largest > tolerance) {
    return simplify(points.slice(0, index + 1), tolerance)
      .slice(0, -1)
      .concat(simplify(points.slice(index), tolerance));
  }
  return [points[0], points[points.length - 1]];
};

const simplifyRing = (ring: PolygonM, tolerance: number): PolygonM => {
  if (ring.length < 5) return ring;
  let far = 0;
  let best = -1;
  for (let i = 1; i < ring.length; i += 1) {
    const distance = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]);
    if (distance > best) {
      best = distance;
      far = i;
    }
  }
  const first = simplify(ring.slice(0, far + 1), tolerance);
  const second = simplify(ring.slice(far).concat([ring[0]]), tolerance);
  return first.slice(0, -1).concat(second.slice(0, -1));
};

/**
 * Fetch buildings and roads around a point and shape them into a scene in the
 * same compact form as the baked areas.
 */
export const fetchScene = async (
  place: Place,
  radiusM = 500,
  fetchImpl: typeof fetch = fetch,
): Promise<Scene> => {
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((place.lat * Math.PI) / 180);
  const south = place.lat - radiusM / mPerDegLat;
  const north = place.lat + radiusM / mPerDegLat;
  const west = place.lng - radiusM / mPerDegLng;
  const east = place.lng + radiusM / mPerDegLng;

  const query = `[out:json][timeout:45];(way["building"](${south},${west},${north},${east});way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|service)$"](${south},${west},${north},${east}););out geom;`;

  const response = await fetchImpl(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  const text = await response.text();
  if (!text.trim().startsWith("{")) throw new Error("OpenStreetMap is busy, try again in a moment");
  const payload = JSON.parse(text) as {
    elements: { geometry?: { lat: number; lon: number }[]; tags?: Record<string, string> }[];
  };

  const toMetres = (point: { lat: number; lon: number }): [number, number] => [
    (point.lon - west) * mPerDegLng,
    (point.lat - south) * mPerDegLat,
  ];
  const encode = (points: PolygonM) => points.map((p) => `${Math.round(p[0])},${Math.round(p[1])}`).join(" ");

  // Heights come through on the live path as well, so a typed address gets the
  // same neighbour check as a baked area. Where a building carries neither a
  // height nor a floor count, it stays null and is reported as unknown rather
  // than filled in with a guess.
  const storeyM = 3.2;
  const heightOf = (tags: Record<string, string> | undefined) => {
    if (!tags) return { h: null as number | null, hs: null as string | null };
    if (tags.height) {
      const value = parseFloat(tags.height.replace(/[^0-9.]/g, ""));
      if (Number.isFinite(value) && value > 0) return { h: Math.round(value * 10) / 10, hs: "height" };
    }
    if (tags["building:levels"]) {
      const value = parseFloat(tags["building:levels"]);
      if (Number.isFinite(value) && value > 0) {
        return { h: Math.round(value * storeyM * 10) / 10, hs: "levels" };
      }
    }
    return { h: null as number | null, hs: null as string | null };
  };

  const buildings: { a: number; p: string; h: number | null; hs: string | null }[] = [];
  const roads: { c: string; p: string }[] = [];

  for (const element of payload.elements) {
    if (!element.geometry || element.geometry.length < 2) continue;
    const points = element.geometry.map(toMetres);
    if (element.tags?.building) {
      const closed =
        Math.abs(points[0][0] - points[points.length - 1][0]) < 0.01 &&
        Math.abs(points[0][1] - points[points.length - 1][1]) < 0.01;
      const ring = closed ? points.slice(0, -1) : points;
      const area = polygonAreaM2(ring);
      if (area < 300) continue;
      let simplified = simplifyRing(ring, 1.5);
      if (simplified.length < 3) simplified = ring;
      const { h, hs } = heightOf(element.tags);
      buildings.push({ a: Math.round(area), p: encode(simplified), h, hs });
    } else if (element.tags?.highway) {
      const simplified = simplify(points, 5);
      if (simplified.length >= 2) roads.push({ c: element.tags.highway[0], p: encode(simplified) });
    }
  }

  buildings.sort((a, b) => b.a - a.a);
  if (buildings.length === 0) {
    throw new Error("No buildings are mapped here yet. Upload the outline instead.");
  }

  return {
    id: `live-${Math.round(place.lat * 1e4)}-${Math.round(place.lng * 1e4)}`,
    label: place.label.split(",")[0],
    area: place.label,
    o: [west, south],
    size: [Math.round((east - west) * mPerDegLng), Math.round((north - south) * mPerDegLat)],
    b: buildings.slice(0, 120),
    r: roads.slice(0, 200),
  };
};
