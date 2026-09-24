# UAE multi-source screening

Open **UAE energy mixes** in the top bar for 12 examples. The first is Masdar's
Sir Bani Yas solar + wind project. Delma demonstrates wind without solar. DIC,
Sharjah and Ajman demonstrate solar only. Wadi Ham demonstrates hypothetical
solar + recoverable water flow. Each portfolio building also has an **Explore
this site's energy mix** section, with solar capacity capped by its existing
roof screening result. Selections and reduced capacities persist per site for
the browser session, including when switching portfolios or examples.

The main picker includes all four portfolios from the supplied HTML, registered
in `renewable-portfolios.ts`. Inline source changes refresh both the site verdict
and portfolio rail. Regional maps replace missing scene references; they show no
invented footprints. The original rooftop portfolios remain available. The app
opens on Inland Solar Focus, and wind-only sites initialize with wind selected.
Empty selections keep their toggles visible so they can be re-enabled.

The additional example explorer is separate from the rooftop map: no invented industrial
footprint is attached to a real operator, and hypothetical wind economics do not
override an evidence-gated rooftop recommendation. Examples are named by
location and industry; Masdar is named only for published installations.

## Data and evidence

- `uae-monthly-profiles.ts`: solar uses the existing hourly PV model fitted to
  the bundled PVGIS SARAH3 2018–2022 data at 32 UAE coordinates, then sums AC
  output by month. The model includes temperature, dust and electrical losses.
  Irradiation in kWh/m² is not treated as PV yield in kWh/kWp.
- `portfolios-uae-multi.ts`: loads, comparison tariffs, costs, hypothetical
  capacities, wind factors and water flows are assumptions, not operator data.
- [Masdar, 5 October 2023](https://masdar.ae/en/news/newsroom/khaled-bin-mohamed-bin-zayed-inaugurates-uae-wind-program)
  confirms 45 MW wind + 14 MWp solar at Sir Bani Yas and 27 MW wind at Delma.
  It does not establish the output or finances used in these comparisons.
  Masdar describes night-time wind complementarity, which must not be confused
  with a proven six-month seasonal offset.
- [DEWA Hatta project](https://www.dewa.gov.ae/en/about-us/strategic-initiatives/hatta-project):
  pumped storage moves electricity through time and consumes charging energy.
  It is excluded from new renewable generation in this engine.
- Geothermal electricity is disabled in the examples for lack of measured
  subsurface temperature/depth/flow evidence. This is not a claim that all UAE
  geothermal or direct-use heat is impossible.

There are no measured wind or wadi series in this repository. Wind sensitivity
cases use flat monthly capacity factors ranging from 11–20%, explicitly shown
as assumptions. Unknown locations throw errors instead of falling back to a
different location. Wadi Ham's illustrative flows are explicitly shown in the
UI; they must not be quoted as measured natural runoff. No claimed MERRA-2
download, guaranteed payback or fixed complementarity score is used.

## Equations and interpretation

- Solar: aggregate the existing PV simulation per installed kWp by month.
  Existing building comparisons scale the monthly shape to the rooftop engine's
  annual shading-adjusted energy. Standalone examples do not have surveyed roofs.
- Wind: `kWh = rated kW × assumed capacity factor × hours in month`.
- Hydro: `kW = min(turbine kW, 9.81 × flow m³/s × head m × efficiency)`.
- Monthly matched energy: `min(total generation, monthly consumption)`.
  Default load is uniform power over 8,760 hours. Callers can supply twelve
  monthly readings whose sum must equal annual consumption.
- Gross savings: matched energy × assumed avoided tariff. Export revenue is
  zero. This is an optimistic monthly matching ceiling, not an hourly dispatch
  or utility slab/credit calculation; the original rooftop engine retains those.
- Each source gets a proportional share of monthly savings. Multiple sources
  cannot each claim the same displaced consumption.
- Net savings: gross savings − annual O&M. Simple payback: capex / positive
  net savings. No positive return, no investment or no selection yields `null`,
  rendered as a dash, never Infinity. Financing, tax, replacement costs and
  degradation are excluded from this simple comparison.
- Coverage is monthly matched energy / annual load, capped at 100%. Generation
  / load is shown separately and can exceed 100%; neither implies autonomy.
- Stability: `100 × max(0, 1 − CV)` of daily-average monthly output. This is a
  descriptive seasonal index, not grid reliability. Peak separation uses the
  circular difference between non-flat profiles' peak output rates. A flat
  assumed wind profile has no established seasonal peak.

## API

```ts
import { UAE_RENEWABLE_CASES, systemsForCase } from "./portfolios-uae-multi";
import { analyzeRenewableCombination, compareScenarios } from "../engine/renewable-combinations";

const site = UAE_RENEWABLE_CASES.find(s => s.id === "ruwais-mix")!;
const systems = systemsForCase(site);
const result = analyzeRenewableCombination(site.name, systems, site.annualKwh,
  { tariffAedPerKwh: 0.30 });
const alternatives = compareScenarios(systems.map(s => ({ name: s.source, systems: [s] })), site.annualKwh);
```

The engine also exports `calculateFinancial`, `analyzeComplementarity` and
`hydroMonthlyYield`. Inputs must be finite/nonnegative; monthly arrays must have
twelve entries. Yield cannot exceed monthly nameplate output; duplicate source
entries are rejected. `getMonthlyProfile` returns normalized configured wind
shares; solar uses `solarMonthlyYield` at coordinates and hydro uses head/flow.

Run `npm test`, `npm run typecheck`, and `npm run build`.
Battery sizing, hourly wind dispatch, a resource map and financial optimization
are not part of this addition. They remain future phases in the supplied brief.

### Published warehouse comparison cases

The default portfolio now includes Aramex Dubai Logistics City and IKEA Supply's DWC warehouse. `published-warehouses.ts` preserves linked publication facts separately from financial assumptions. Aramex's approximately 5 GWh annual yield is distributed by the modeled monthly shape; its comparison consumption is derived from the reported 60% coverage forecast. IKEA has published capacity but modeled output and assumed consumption. Neither case establishes actual project payback or availability for investment.

Initial financial scenarios use the historical MCC rooftop cost benchmark midpoint (AED 2,500/kW, real 2024 prices), 1.5% annual O&M, and AED 0.44/kWh (DEWA top slab plus September 2026 fuel surcharge, excluding VAT). The five-year hurdle is unchanged. Capacity, capex per kW, annual load and avoided rate can be edited; calculations and portfolio statuses update together. Approved loads remain unknown. Existing installed capacity is not a new-build connection approval.

### Mapped companies and non-solar assets

The default **Mapped UAE Energy Projects** portfolio adds locally stored OSM geometry, including Aramex's named warehouse footprint, Al Halah's Masdar turbine point and Hatta's lower reservoir shoreline. Al Rawabi uses a named farm point with contextual building outlines whose operator is not verified. Each feature links to its OSM record; shapes remain visible without online map tiles. Geometry is in `src/data/geometry`, retrieved 24 September 2026, © OpenStreetMap contributors under ODbL. Stored geometry is not a roof/equipment survey.

Al Rawabi's company page publishes 1 MW solar and 1.3 MW biogas capacity. Al Halah's 4.5 MW wind rating is sourced to Masdar and agrees with the mapped turbine. Their monthly output explorer uses adjustable, explicitly assumed capacity factors (initially 80% biogas and 18% wind), with modeled solar generation. Neither case is assigned fictitious operating costs, meter consumption, savings or payback. Hatta's separate storage calculator uses DEWA's 250 MW, 1,500 MWh and 78.9% round-trip efficiency, keeping charging energy, returned energy and losses separate. It does not add storage discharge to renewable generation totals. Published Hatta project status is dated rather than assumed operational.
