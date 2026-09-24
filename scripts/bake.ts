/**
 * Bake real data into the bundle.
 *
 * Run this on a machine with normal internet access:
 *   npm run bake
 *
 * It pulls a PVGIS typical year and OSM building footprints for each study
 * point and writes them to src/data/snapshots.json. The app then opens with
 * real data even if the venue wifi dies, and only needs the network when
 * someone screens a site that is not in the file.
 *
 * Every snapshot records the date it was retrieved, and the UI shows it.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { fetchBuildings, type BuildingFootprint } from "../src/connectors/overpass.ts";
import { fetchTmy, toSnapshot, type WeatherSnapshot } from "../src/connectors/pvgis.ts";
import type { LatLng } from "../src/engine/types.ts";

type StudyPoint = {
  id: string;
  label: string;
  area: string;
  location: LatLng;
  radiusM: number;
};

/**
 * Public industrial areas used to demonstrate the tool. These are study points,
 * not companies: the app never claims a named tenant occupies a given roof.
 */
const STUDY_POINTS: StudyPoint[] = [
  {
    id: "jafza",
    label: "Jebel Ali Free Zone study point",
    area: "Jebel Ali Free Zone, Dubai",
    location: { lat: 25.0118, lng: 55.0877 },
    radiusM: 500,
  },
  {
    id: "dubai-industrial-city",
    label: "Dubai Industrial City study point",
    area: "Dubai Industrial City",
    location: { lat: 24.9841, lng: 55.1744 },
    radiusM: 500,
  },
  {
    id: "kizad",
    label: "KEZAD study point",
    area: "KEZAD, Abu Dhabi",
    location: { lat: 24.6033, lng: 54.7215 },
    radiusM: 500,
  },
  {
    id: "sharjah-industrial",
    label: "Sharjah Industrial Area study point",
    area: "Sharjah Industrial Area",
    location: { lat: 25.3208, lng: 55.4033 },
    radiusM: 500,
  },
];

type Snapshot = {
  generatedAt: string;
  points: {
    id: string;
    label: string;
    area: string;
    location: LatLng;
    weather: WeatherSnapshot | null;
    weatherError?: string;
    buildings: { osmId: number; ring: [number, number][]; areaM2: number; tags: Record<string, string> }[];
    buildingsError?: string;
  }[];
};

const here = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(here, "../src/data/snapshots.json");

const trimBuildings = (buildings: BuildingFootprint[]) =>
  buildings.slice(0, 40).map((building) => ({
    osmId: building.osmId,
    // Six decimals is about 0.1 m, which is more than enough and keeps the file small.
    ring: building.ring.map(
      ([lng, lat]) => [Math.round(lng * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6] as [number, number],
    ),
    areaM2: Math.round(building.areaM2),
    tags: building.tags,
  }));

const main = async () => {
  const snapshot: Snapshot = { generatedAt: new Date().toISOString(), points: [] };

  for (const point of STUDY_POINTS) {
    process.stdout.write(`${point.id}: `);
    const entry: Snapshot["points"][number] = {
      id: point.id,
      label: point.label,
      area: point.area,
      location: point.location,
      weather: null,
      buildings: [],
    };

    try {
      const weather = await fetchTmy(point.location);
      entry.weather = toSnapshot(point.id, point.label, point.location, weather);
      process.stdout.write("PVGIS ok, ");
    } catch (error) {
      entry.weatherError = error instanceof Error ? error.message : String(error);
      process.stdout.write(`PVGIS failed (${entry.weatherError}), `);
    }

    try {
      const buildings = await fetchBuildings(point.location, point.radiusM);
      entry.buildings = trimBuildings(buildings);
      const total = entry.buildings.reduce((sum, item) => sum + item.areaM2, 0);
      process.stdout.write(
        `${entry.buildings.length} buildings, ${total.toLocaleString()} m2 of roof\n`,
      );
    } catch (error) {
      entry.buildingsError = error instanceof Error ? error.message : String(error);
      process.stdout.write(`Overpass failed (${entry.buildingsError})\n`);
    }

    snapshot.points.push(entry);
    // Stay well inside both services' rate limits.
    await new Promise((sleep) => setTimeout(sleep, 1200));
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(snapshot));
  const withWeather = snapshot.points.filter((point) => point.weather).length;
  const withBuildings = snapshot.points.filter((point) => point.buildings.length > 0).length;
  console.log(
    `\nWrote ${outputPath}\n  ${withWeather}/${snapshot.points.length} points have a PVGIS year` +
      `\n  ${withBuildings}/${snapshot.points.length} points have OSM footprints`,
  );
  if (withWeather < snapshot.points.length || withBuildings < snapshot.points.length) {
    console.log(
      "\nSome sources failed. The app falls back to the modelled clear-sky year and to\n" +
        "drawn or uploaded boundaries, and labels both as such. Re-run when you have a\n" +
        "clean connection.",
    );
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
