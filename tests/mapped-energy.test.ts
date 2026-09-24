// @ts-expect-error Node.js type definitions are not included in this project.
import assert from "node:assert/strict";
// @ts-expect-error Node.js type definitions are not included in this project.
import test from "node:test";
import { MAPPED_ENERGY_PROJECTS } from "../src/data/mapped-energy-projects.ts";
import { projectMapBox } from "../src/web/project-map.ts";
import { capacityFactorMonthly, storageCycle } from "../src/engine/published-energy.ts";

test("mapped projects preserve real geometry and frame every feature", () => {
  assert.equal(MAPPED_ENERGY_PROJECTS.sites.length, 4);
  for (const site of MAPPED_ENERGY_PROJECTS.sites) {
    const geometry = site.mapGeometry!;
    assert.ok(geometry.features.length);
    const box = projectMapBox(geometry);
    assert.ok(Number.isFinite(box.w) && box.w > 0);
    for (const feature of geometry.features) {
      assert.match(feature.url, /^https:\/\/www.openstreetmap.org\/(way|node)\/\d+$/);
      for (const [lng, lat] of feature.coordinates) {
        const x = (lng - box.origin[0]) * 111320 * Math.cos(box.origin[1] * Math.PI / 180);
        const y = (lat - box.origin[1]) * 111320;
        assert.ok(x > box.x && x < box.x + box.w);
        assert.ok(y > box.y && y < box.y + box.h);
      }
      if (feature.coordinates.length > 1) assert.deepEqual(feature.coordinates[0], feature.coordinates.at(-1));
    }
  }
  assert.equal(MAPPED_ENERGY_PROJECTS.sites[0].mapGeometry!.features[0].id, "307805557");
});

test("wind and biogas output scenarios conserve energy and reject impossible factors", () => {
  const wind = capacityFactorMonthly(4500, 0.18);
  assert.ok(Math.abs(wind.reduce((a, b) => a + b, 0) - 4500 * 8760 * 0.18) < 1e-8);
  assert.equal(capacityFactorMonthly(1300, 0.8).reduce((a, b) => a + b, 0), 9_110_400);
  assert.deepEqual(capacityFactorMonthly(1300, 0), Array(12).fill(0));
  assert.throws(() => capacityFactorMonthly(1300, 1.01));
  assert.throws(() => capacityFactorMonthly(1300, NaN));
});

test("Hatta consumes more energy than it returns and is kept separate from generation", () => {
  const site = MAPPED_ENERGY_PROJECTS.sites.find(s => s.id === "mapped-hatta")!;
  const storage = site.publishedEnergy!.storage!;
  assert.deepEqual(site.publishedEnergy!.assets, []);
  assert.equal(site.hydro, undefined);
  const cycle = storageCycle(storage, 1);
  assert.equal(cycle.deliveredMwh, 1500);
  assert.equal(cycle.dischargeHours, 6);
  assert.ok(cycle.chargingMwh > cycle.deliveredMwh);
  assert.ok(Math.abs(cycle.deliveredMwh / cycle.chargingMwh - 0.789) < 1e-10);
  assert.equal(storageCycle(storage, 0.5).deliveredMwh, 750);
  assert.deepEqual(storageCycle(storage, 0), { deliveredMwh: 0, chargingMwh: 0, lossMwh: 0, dischargeHours: 0 });
  assert.throws(() => storageCycle(storage, -1));
});
