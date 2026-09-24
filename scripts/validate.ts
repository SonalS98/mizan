/**
 * Check the whole engine against PVGIS, end to end.
 *
 *   npx tsx scripts/validate.ts
 *
 * `calibrate.ts` checks the sunlight going in. This checks the kilowatt-hours
 * coming out: one kilowatt-peak on a flat roof at ten degrees, due south, run
 * through this engine and through PVGIS's own PV model at the same 16 UAE
 * coordinates with the same non-thermal losses.
 *
 * What this is and is not. PVGIS PVcalc is a model, not a metered system. It
 * is driven by measured satellite irradiance and has been validated against
 * real installations across many countries, so agreeing with it is worth
 * something. It is not the same as agreeing with a real UAE system's meter,
 * and this engine still claims no such thing.
 *
 * One parameter in the engine is fitted here rather than taken from a paper:
 * the wind actually reaching a module, as a share of the ten-metre wind a
 * weather file reports. It is fitted by leaving each site out in turn, so the
 * error printed is the error on sites the fit never saw.
 */

import {
  MOUNTING_THERMAL,
  WIND_AT_MODULE,
  huldRelativeEfficiency,
  modelledWeatherYear,
  moduleTemperature,
  solarPosition,
  transpose,
} from "../src/engine/solar";
import { DEFAULT_PV_LOSSES, meanSoilingLoss } from "../src/engine/pv";
import { HOURS_PER_YEAR } from "../src/engine/types";
import reference from "../src/data/pvgis-uae-pvcalc.json" with { type: "json" };

type Site = { n: string; lat: number; lon: number; E_y: number; H_y: number; l_tg: number };
const SITES = reference.sites as Site[];

const losses = DEFAULT_PV_LOSSES;
const afterThermal =
  (1 - meanSoilingLoss(losses)) *
  (1 - losses.dcLosses) *
  losses.inverterEfficiency *
  losses.availability *
  (1 - losses.otherLosses);

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** One site, one wind factor: annual AC kWh per kWp, and the in-plane year. */
const simulate = (site: Site, windFactor: number) => {
  const at = { lat: site.lat, lng: site.lon };
  const weather = modelledWeatherYear(at);
  const thermal = MOUNTING_THERMAL["roof-flat"];
  let poaKwh = 0;
  let effectiveKwh = 0;
  let dcKwh = 0;
  for (let hour = 0; hour < HOURS_PER_YEAR; hour += 1) {
    if (weather.ghi[hour] <= 0) continue;
    const sun = solarPosition(at, hour);
    const poa = transpose(weather.ghi[hour], Math.floor(hour / 24) + 1, sun, 10, 0, 0.15);
    if (poa.effectiveWm2 <= 0) continue;
    poaKwh += poa.poaWm2 / 1000;
    effectiveKwh += poa.effectiveWm2 / 1000;
    const cellC = moduleTemperature(
      poa.poaWm2,
      weather.ambientC[hour],
      weather.windMs[hour] * windFactor,
      thermal.u0,
      thermal.u1,
    );
    dcKwh += (poa.effectiveWm2 / 1000) * huldRelativeEfficiency(poa.effectiveWm2, cellC);
  }
  return {
    poaKwh,
    yieldKwh: dcKwh * afterThermal,
    thermalLoss: effectiveKwh > 0 ? 1 - dcKwh / effectiveKwh : 0,
  };
};

/** The wind factor that zeroes the bias over a given set of sites. */
const fitWind = (train: Site[]): number => {
  let low = 0.1;
  let high = 1.5;
  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) / 2;
    const bias = mean(train.map((s) => (simulate(s, mid).yieldKwh - s.E_y) / s.E_y));
    // More wind cools the modules, so yield rises with the factor.
    if (bias > 0) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
};

const run = () => {
  console.log(`\nReference: ${reference.source}`);
  console.log(`           ${reference.settings}`);
  console.log(`           ${SITES.length} UAE coordinates\n`);

  // In-plane irradiance first: if the sunlight is wrong, nothing after it can
  // be right for the right reason.
  const poaErrors = SITES.map((s) => (simulate(s, WIND_AT_MODULE).poaKwh - s.H_y) / s.H_y);
  console.log(
    `Sunlight on the modules   bias ${(mean(poaErrors) * 100).toFixed(2)}%` +
      `   mean abs ${(mean(poaErrors.map(Math.abs)) * 100).toFixed(2)}%`,
  );

  // Then the yield, with the wind factor fitted on every site but the one
  // being scored.
  const held: number[] = [];
  const fitted: number[] = [];
  for (let i = 0; i < SITES.length; i += 1) {
    const factor = fitWind(SITES.filter((_, j) => j !== i));
    fitted.push(factor);
    held.push((simulate(SITES[i], factor).yieldKwh - SITES[i].E_y) / SITES[i].E_y);
  }
  const worst = held
    .map((e, i) => ({ e, name: SITES[i].n }))
    .sort((a, b) => Math.abs(b.e) - Math.abs(a.e))[0];

  console.log(
    `Yield, site left out      bias ${(mean(held) * 100).toFixed(2)}%` +
      `   mean abs ${(mean(held.map(Math.abs)) * 100).toFixed(2)}%` +
      `   worst ${worst.name} ${(worst.e * 100).toFixed(2)}%`,
  );
  console.log(
    `Wind factor               fitted ${Math.min(...fitted).toFixed(3)} to ${Math.max(...fitted).toFixed(3)} across the folds,` +
      ` engine ships ${WIND_AT_MODULE}\n`,
  );

  console.log("  site             ours   PVGIS    diff    heat+light: ours / PVGIS");
  for (const site of SITES) {
    const run = simulate(site, WIND_AT_MODULE);
    const diff = ((run.yieldKwh - site.E_y) / site.E_y) * 100;
    console.log(
      `  ${site.n.padEnd(15)} ${run.yieldKwh.toFixed(0).padStart(5)} ${site.E_y.toFixed(0).padStart(7)}` +
        `  ${diff.toFixed(2).padStart(6)}%    ${(run.thermalLoss * 100).toFixed(1)}% / ${(-site.l_tg).toFixed(1)}%`,
    );
  }
  console.log();
};

run();
