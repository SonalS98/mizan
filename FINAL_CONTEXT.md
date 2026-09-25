# Mizan — Final Repository Context

Prepared: **25 September 2026**

Repository: **SonalS98/mizan**  
Branch: **main**  
Authoritative revision used for this context: **1c9aa2eb9a011e3daa9407d001beed73308cb4ed**  
Project package: **mizan-uae-renewable-planner v0.4.0**

This file is the top-level context for understanding Mizan as it exists now. It is intended for engineers, reviewers, demo operators, and coding agents who need to work on the repository without reconstructing earlier conversations.

The most important rule is: **treat the source code on main as authoritative, not older handoff notes or generated files.** The repository changed substantially on 25 September 2026. In particular, the latest merged work added a physical wind model, verified UAE wind/climate data, per-emirate legal gating, a renewable recommender, and the Analyze your own site document workflow. Older documentation can still be useful background, but it predates those additions.

---

## 1. What Mizan is

Mizan is a **UAE renewable-energy screening, site-analysis, and project-exploration application**.

Its core question is:

> For a real or example UAE site, what renewable energy can realistically be installed, how much energy might it produce, what could it save, and what technical or regulatory constraint prevents the next option?

Mizan combines five ideas that are often separate tools:

1. **Site and roof screening** — building geometry, roof packing, shading, wiring, structural screening, and utility capacity limits.
2. **Energy modelling** — hourly rooftop solar and storage modelling plus monthly multi-source solar/wind/hydro screening.
3. **Financial screening** — capex, O&M, savings, payback, lifecycle metrics, and comparison against an investment hurdle.
4. **UAE-specific regulatory gating** — different rules for Dubai, Abu Dhabi, Sharjah, and EtihadWE emirates.
5. **Evidence/provenance** — source links, dates, caveats, and explicit separation between published facts and assumptions.

It is a **TypeScript/Vite browser application using direct DOM rendering**. It is not React, Next.js, a backend SaaS platform, or an AI-agent product.

There is no database, user account system, authentication layer, server-side persistence, or production deployment framework in this repository.

---

## 2. What the user can do

### A. Explore mapped UAE energy projects

The default experience includes named UAE projects with mapped assets and source-linked facts.

Current examples include:

- Aramex Dubai Logistics City solar
- Al Rawabi solar + biogas CHP
- Masdar Al Halah wind
- DEWA Hatta pumped storage
- published warehouse solar examples such as IKEA Supply
- broader UAE solar/wind screening examples across all seven emirates

Published capacities are separated from modelled energy and financial assumptions.

### B. Screen detailed rooftop solar

For the legacy rooftop portfolio path, Mizan can:

- map an actual stored building outline
- calculate usable roof area
- pack panel rows inside the polygon
- compare south-facing and east-west layouts
- apply setbacks
- calculate row-to-row shading
- calculate obstruction shading from taller neighbouring buildings when heights are known
- size inverter strings against hot/cold UAE conditions
- draw wiring and cable routing
- simulate an hourly PV year
- simulate an hourly site load
- dispatch an optional battery
- calculate tariffs and annual bills
- calculate capex, savings, payback, NPV, IRR, LCOE, PPA/ownership comparisons, and avoided CO2
- run uncertainty/sensitivity logic
- rank candidate system sizes

### C. Compare renewable energy mixes

The renewable-combinations path compares monthly combinations of:

- solar
- wind
- hypothetical micro-hydro where explicit head/flow inputs exist

It reports:

- monthly generation
- annual output
- monthly load matching
- a load-coverage ceiling
- surplus
- simple financial screening
- source complementarity / seasonality

This path is deliberately simpler than the detailed rooftop planner. It is **monthly**, not hourly, and its simple payback is not equivalent to the lifecycle finance in the detailed rooftop planner.

### D. Get a Mizan renewable recommendation

The current recommender answers:

> What mix should this site assess, how much of each source, and what does the emirate allow?

It combines:

- a site solar design ceiling
- approved-load / utility connection limits where available
- UAE solar yield
- a physical wind model
- generic screening capex/O&M assumptions
- monthly load matching
- an investment-hurdle filter
- per-emirate legal rules

The search is intentionally small and explainable. It tries several solar sizes and feasible turbine counts rather than using a black-box optimizer.

A recommendation can include solar, wind, or both. Technically attractive options that fail a published connection rule are listed as rejected instead of being silently recommended.

### E. Analyze a user's own site

The current UI includes **+ Analyze your own site**.

The user can either:

- enter details manually, or
- upload PDF, TXT, CSV, MD, or text files

The upload path is local and deterministic. It does **not** call an LLM.

Mizan extracts and asks the user to review:

- business/site name
- address/location
- emirate
- annual electricity use
- monthly electricity use when detectable
- approved load / connection capacity
- roof area
- roof construction
- building/site type

Every extracted value carries a source such as document name and page. Conflicting values across multiple documents are surfaced for user confirmation.

Nothing enters the analysis until the user clicks **Confirm & Analyze Site**.

Important limitations:

- extraction is regular-expression based
- scanned/image-only PDFs are not OCR'd
- missing values still need manual entry
- custom-site geolocation is approximate unless the address matches a configured study location
- custom-site roof capacity is a screening estimate, not a surveyed design

---

## 3. The calculation architecture: there is not one single engine path

Mizan currently has several related but distinct calculation paths.

### 3.1 Detailed rooftop planning

Main flow:

**src/web/main.ts → src/engine/plan.ts**

This is the highest-detail path.

It works with:

- hourly weather
- hourly load
- roof geometry
- panel packing
- detailed shading
- electrical design
- utility tariff logic
- battery dispatch
- lifecycle finance
- uncertainty

This is the path that can answer roof-fit and engineering questions.

### 3.2 Monthly renewable combinations

Main flow:

**src/web/renewables.ts → src/engine/renewable-combinations.ts**

This path is used for the UAE energy-mix examples and recommendation comparison.

It uses:

- twelve monthly yield values per source
- twelve monthly load values or a generated monthly load split
- monthly self-consumption matching
- simple capex/O&M/payback screening

It does **not** establish:

- hourly coincidence
- battery dispatch
- demand-charge reduction
- export settlement
- detailed electrical design
- a bankable lifecycle model

### 3.3 Published project explorer

Main flow:

**src/web/published-energy.ts + src/engine/published-energy.ts**

This path presents source-linked project specifications and lets users run clearly labelled output scenarios.

It is designed specifically to avoid pretending that published capacity equals known project economics.

### 3.4 Renewable recommendation layer

Main engine:

**src/engine/recommend.ts**

The recommender:

1. calculates the legal/approved solar ceiling
2. selects the nearest configured wind climate
3. runs a turbine through the physical wind model
4. decides whether wind is worth considering
5. checks whether the emirate has a published/non-published path for that technology
6. searches several solar sizes and turbine counts
7. evaluates monthly matched savings
8. filters around the investment hurdle
9. returns:
   - recommended mix
   - rejected options and reasons
   - legal status items
   - evidence still needed
   - solar cap explanation
   - wind capacity factor and hub wind where applicable

This is a **screening recommender**, not an exhaustive optimization solver.

### 3.5 Document extraction path

Main flow:

**src/web/custom-site.ts → src/engine/extract.ts → renewable case → recommender**

The document extraction module is intentionally separate from the physics/financial engine. It converts user-confirmed document values into the same renewable-case shape used by the examples.

---

## 4. Technology stack

### Runtime/application

- TypeScript
- Vite
- direct DOM APIs
- SVG/HTML rendering
- ES modules

### Dependencies

Current package.json includes:

- TypeScript
- Vite
- tsx
- Node type definitions
- pdfjs-dist

There is no React, Vue, Svelte, charting framework, GIS framework, database client, backend framework, or AI SDK.

### Local demo server

**serve.mjs** is a dependency-free Node HTTP server.

Primary demo command:

~~~sh
node serve.mjs
~~~

Open:

~~~text
http://localhost:4173/
~~~

It serves the already-built **dist/local.html**.

### Development

~~~sh
npm install
npm run dev
~~~

Useful commands:

~~~sh
npm run typecheck
npm test
npm run build
npm run page
npm run demo
npm run validate
npm run calibrate
npm run bake
npx tsx scripts/fetch-wind.ts
~~~

---

## 5. Source-of-truth hierarchy

When files disagree, use this priority:

1. current source code on main
2. current tests
3. SOURCES.md for provenance and legal/resource evidence
4. current data files in src/data
5. DEMO.md for the latest intended demo path
6. README.md for general product framing
7. DEVIN.md for the 24 September handoff architecture
8. generated files under dist and root index.html only as build artifacts

Do **not** hand-edit generated bundles as source.

---

## 6. Repository map

### Root

**README.md**  
Product overview, rooftop engineering explanation, accuracy framing, run instructions. Some integration statements should be checked against actual callers before treating them as current.

**FINAL_CONTEXT.md**  
This file.

**DEVIN.md**  
Detailed engineering handoff prepared on 24 September 2026. Very useful for the pre-recommender architecture, but older than the current main branch.

**SOURCES.md**  
Current provenance ledger for climate/resource data, legal rules, project evidence, and recommendation validation.

**DEMO.md**  
Three-minute demo runbook for the current recommender and custom-site flow.

**DEVIN_DEMO_NOTES.md**  
Summary of the latest autonomous engineering work and strongest demo evidence.

**package.json**  
Scripts and dependencies.

**vite.config.ts**  
Vite port/build target and proxy routes.

**serve.mjs**  
Standalone local server and API proxies.

**index.html**  
Generated development shell. Do not treat as the primary editable template.

**dist/**  
Generated build output, including standalone local/page HTML and bundled assets.

### src/engine

**types.ts**  
Core geography, site, evidence, provenance, hourly-series, screening, and result contracts.

**solar.ts**  
Solar position, weather/irradiance model, transposition, module-temperature inputs, UAE calibration.

**pv.ts**  
Hourly PV AC simulation, loss stack, yield outputs, validation metadata.

**capacity.ts**  
Polygon area, approximate usable capacity, row spacing and geometric capacity helpers.

**packing.ts**  
Panel-row packing inside local-metre roof polygons, setbacks, layout and placement geometry.

**shading.ts**  
Row shading, bypass-diode effects, fill-dependent shading curves, neighbouring-building skyline losses.

**electrical.ts**  
Module/inverter catalogue, temperature-dependent string sizing, MPPT constraints, inverter allocation, string/wiring routes, cable sizing and BOM logic.

**load.ts**  
Sector load-shape generation and annual/monthly scaling.

**tariff.ts**  
DEWA and Abu Dhabi tariff definitions, tariff selection and billing logic.

**rules.ts**  
Per-emirate renewable rules, regulatory capacity caps, structural screening, technology screening.

**battery.ts**  
Hourly surplus battery dispatch and energy balance.

**finance.ts**  
Capex, annual cashflows, payback, NPV, IRR, LCOE, ownership/PPA comparisons and CO2 effects.

**uncertainty.ts**  
Seeded Monte Carlo uncertainty and one-variable sensitivity.

**plan.ts**  
Detailed rooftop planning coordinator. Builds context, evaluates candidate sizes/layouts/storage, and ranks results.

**renewable-combinations.ts**  
Monthly multi-source generation/load/financial screen and complementarity metrics.

**wind.ts**  
Physical UAE wind model using site climate + turbine characteristics.

**recommend.ts**  
Renewable mix recommender with resource, economics and legal gating.

**extract.ts**  
Deterministic field extraction and multi-document conflict merging for user uploads.

**published-energy.ts**  
Pure helpers for published-project output/storage scenarios.

**index.ts**  
Barrel exports for many legacy engine modules. It does **not** export every newer module, so direct imports are normal.

### src/web

**main.ts**  
Primary application entry point and current top-level UI controller.

**shell.html**  
Shared page markup and most CSS. DOM IDs/classes are effectively an integration contract with renderers.

**map.ts**  
Legacy building/roof/wiring/shading map scene rendering.

**tiles.ts**  
Map tile layers, attribution, loading/error behaviour.

**project-map.ts**  
Mapped named-project geometry and asset rendering.

**renewable-workspace.ts**  
Three-column portfolio workspace for renewable cases and published projects.

**renewables.ts**  
Monthly source controls, charts/tables, recommendation card, apply-recommendation behaviour, financial screening and example picker.

**custom-site.ts**  
Analyze-your-own-site dialog, file parsing, confirmation UI, and creation of a custom renewable case.

**published-energy.ts**  
Published project scenario UI.

**charts.ts**  
Reusable SVG chart helpers. Check current callers before assuming every chart is active.

**live.ts**  
Address-search/live-scene helpers. This file exists, but current top-level integration should be verified before promising live address search in the UI.

**tour.ts**  
Guided-tour/focus helpers. Verify initialization before treating it as an active feature.

### src/connectors

**pvgis.ts**  
PVGIS v5.3 TMY connector, UTC-to-UAE rotation, weather snapshot conversion.

**overpass.ts**  
OSM/Overpass building query/parser plus Nominatim geocoding.

The local Node server and Vite config expose proxy paths for PVGIS, Overpass, and Nominatim. However, the existence of a proxy and connector does not prove the current main UI calls it; verify the active caller path when changing live-data features.

### src/data

Important data areas include:

- portfolios.ts — original rooftop portfolio examples
- portfolios-uae-multi.ts — current 15 UAE renewable examples
- renewable-portfolios.ts — grouped renewable portfolios
- mapped-energy-projects.ts — named mapped energy projects
- published-warehouses.ts — sourced warehouse solar cases
- renewable-combinations guide
- uae-monthly-profiles.ts — monthly resource shapes
- pvgis-uae reference data
- wind-sites.ts — 27 configured UAE wind study locations
- wind-uae.json — generated provenance-stamped wind climate dataset
- geometry/*.json — stored named project geometry
- osm-*.json — stored building scenes

### scripts

**build-shell.mjs**  
Regenerates root index.html from the shared shell.

**build-page.mjs**  
Creates standalone bundled page output.

**demo.ts**  
Programmatic sample engine run.

**validate.ts**  
PV-yield validation against bundled PVGIS reference points.

**calibrate.ts**  
Solar-clearness calibration/cross-validation work.

**bake.ts**  
External-data snapshot helper.

**fetch-wind.ts**  
Fetches and composes ERA5/Open-Meteo + Global Wind Atlas climate data for configured UAE points. Includes resumable caching/backoff and writes wind-uae.json.

**gen-demo-doc.mjs**  
Creates the prepared custom-site demo document.

### tests

Current main includes:

- tests/engine.test.ts
- tests/mapped-energy.test.ts
- tests/renewable-portfolios.test.ts
- tests/renewables.test.ts

The latest demo notes report **83 passing tests** at the merge point. Always rerun the suite after changes rather than treating that count as permanent.

---

## 7. Solar model

The solar path is UAE-specific rather than a flat capacity-factor calculator.

At a high level it:

1. computes solar geometry for every hour
2. generates or consumes an hourly weather year
3. transposes irradiance to the array plane
4. models module temperature
5. applies temperature and low-light behaviour
6. applies named losses
7. applies clipping/inverter effects
8. returns hourly and annual AC generation

The README reports the current calibration/validation framing as:

- annual irradiation model: about **1.9% mean absolute error** against leave-one-out PVGIS SARAH3 reference locations, with no reported bias
- PV yield: about **1.1% mean absolute error** against a matched PVGIS PV model at 16 UAE coordinates, worst reported site about 3.1%

These are model-to-model/reference checks, not field validation against metered UAE installations.

Do not describe Mizan as meter-validated unless real metered data is later added.

---

## 8. Rooftop geometry, shading and electrical design

### Roof packing

Mizan can pack rows into an actual polygon instead of assuming roof area alone.

It accounts for:

- polygon boundaries
- setbacks
- panel dimensions
- row geometry
- south vs east-west layout
- usable fitted module count

### Row shading

Row spacing is designed around a winter-sun rule, but the engine also calculates hour-by-hour shading rather than assuming the design point eliminates all annual shade.

The shading model distinguishes geometric shade from larger electrical loss caused by bypass-diode behaviour.

Shading is dependent on system fill. A smaller system can skip rows and therefore have materially less row shading than a roof-full layout.

### Neighbour shading

Where neighbour heights are known, the engine builds an obstruction skyline from mapped outlines.

Only height **above the subject roof** contributes to obstruction.

Unknown neighbouring heights remain unknown rather than being silently guessed.

### Electrical design

Electrical sizing considers UAE temperature extremes.

The engine checks the tension between:

- cold-condition open-circuit voltage
- hot-condition maximum-power voltage
- inverter DC system limits
- MPPT operating windows

It also creates string allocation, inverter allocation and wiring routes.

This is still a screening/design model and not a stamped construction drawing.

---

## 9. Wind model

The current wind implementation is a major change from the older flat-capacity-factor approach.

### Resource data

The repository has climate for **27 UAE study points** across all seven emirates.

The model combines:

- **Global Wind Atlas** for spatial/hub-height wind level
- **ERA5 reanalysis via Open-Meteo** for monthly seasonality, Weibull shape, temperature and pressure

Terrain/siting distinctions are explicit, including ridge cases where the best-decile Atlas level is used instead of a flat-area mean.

### Physics

For each turbine/site the model:

- chooses/interpolates wind speed at hub height
- fits/uses monthly Weibull distributions
- calculates monthly air density from temperature, pressure and hub height
- derives power from swept area, power coefficient and drivetrain efficiency
- caps at rated output
- integrates the power curve over each monthly Weibull distribution
- applies availability, electrical, soiling and multi-turbine wake allowances

Current archetypes include:

- 10 kW small wind
- 100 kW small wind
- 900 kW mid-scale
- 2 MW utility
- 4.5 MW utility

The model explicitly says it does not resolve turbulence, fine terrain speed-up, detailed wakes, rotor shear, or rooftop-turbine aerodynamics.

### Screening thresholds

windVerdict uses capacity-factor bands as a screening convenience:

- 25% or higher: worth a measurement campaign
- 18–25%: marginal / context dependent
- below 18%: poor against UAE solar economics

The recommender uses roughly the same 18% lower bound before wind is allowed into the mix search.

### Validation framing

SOURCES.md records an independent siting check: the model places the four published Masdar UAE Wind Program sites — Sila, Sir Bani Yas, Delma and Al Halah — within the top seven of 27 screened locations.

This is a useful site-selection validation, not proof that the predicted annual energy equals measured turbine output.

Every wind recommendation should continue to require mast or LiDAR measurement before investment.

---

## 10. UAE legal/regulatory rules encoded in the engine

These are code-level screening assumptions with provenance, not legal advice.

### Dubai

Scheme: **Shams Dubai / DEWA DRRG Connection Conditions v4.1**

Current encoded behaviour includes:

- rooftop/BIPV solar path
- no ground-mount eligibility under Shams Dubai
- tiered Total Connected Load contribution
- maximum 1,000 kW DRRG contribution per plot
- enrolled consultant/contractor requirement
- surplus credited to future bills rather than paid as cash
- published scheme treated as solar-only
- non-solar generation treated as requiring a bespoke licensing path

The Dubai tier logic applies:

- 100% of first 100 kW
- 75% of next 100 kW
- 50% of 200–400 kW
- 25% of 400–600 kW
- 5% above 600 kW
- subject to the plot maximum

### Abu Dhabi

Current source: DoE self-supply policy effective February 2026.

The engine treats this as **partial** because some implementing capacity/network details are not published in the repository's evidence set.

Key encoded cautions:

- self-supply licence required
- no assumption of ordinary net metering
- export compensation is not assumed
- large/industrial cases may require case-by-case treatment
- solar/storage self-supply framework exists, but sizing is indicative without the missing instruments

### Ajman, Umm Al Quwain, Ras Al Khaimah and Fujairah

The engine uses the EtihadWE/federal distributed-renewables framework as a **partial** rule set.

Current encoded screening assumptions include:

- up to 10% of approved load
- up to 1 MW per unit
- monthly netting
- same-year credit
- no cash compensation
- utility and licensed-contractor approvals required

The 10%/1 MW details are explicitly marked as needing confirmation because the underlying ministerial decision text was not directly obtained in the evidence set.

### Sharjah

The engine marks the SEWA path as **unverified**.

Federal distributed-renewables law is referenced, but a sufficiently clear published SEWA customer connection scheme was not found.

The product should not turn that uncertainty into a confident recommendation.

---

## 11. Recommendation logic

recommendMix is intentionally explainable.

Inputs include:

- emirate
- lat/lng
- annual consumption
- solar design ceiling
- approved load when known
- tariff
- monthly solar yield
- solar and wind capex/O&M assumptions
- optional wind site/turbine overrides

High-level algorithm:

1. reduce the solar design ceiling by the regulatory cap where enough account data exists
2. find the nearest wind climate
3. choose a turbine archetype based on likely scale
4. compute wind yield and capacity factor
5. gate wind on:
   - resource threshold
   - rule confidence
   - whether a non-solar connection path exists
6. search four solar fractions: 25%, 50%, 75%, 100% of allowed solar ceiling
7. search feasible turbine counts, bounded to a small number
8. calculate monthly renewable-combination results
9. filter around a default 8-year hurdle
10. select the highest net annual saving among mixes that clear the hurdle
11. if no mix clears it, return the best-payback option rather than inventing a passing result
12. return rejected technologies and evidence requirements separately

This is a screening search, not a mathematically exhaustive optimum.

---

## 12. Financial modelling

Mizan contains two distinct levels of financial calculation.

### Detailed rooftop finance

The detailed planner includes deeper lifecycle finance such as:

- system capex
- cashflows
- payback
- NPV
- IRR
- LCOE
- own-vs-PPA comparison
- avoided CO2
- sensitivity/uncertainty

### Monthly renewable screening finance

renewable-combinations uses a simpler model:

- capex = capacity × assumed AED/kW
- annual O&M = fraction of capex
- gross saving = monthly matched generation × avoided tariff
- net saving = gross saving − O&M
- simple payback = capex / net annual saving

Important: monthly load matching is an **optimistic ceiling** because it does not resolve hour-by-hour coincidence.

No surplus-export revenue is assumed in that path.

Generic renewable screening costs in the current data layer are assumptions, not supplier quotations.

---

## 13. Published projects and evidence discipline

Mizan deliberately distinguishes:

### Published facts

Examples:

- published installed MW/MWp
- project technology
- published storage power/energy
- published annual yield when available
- developer/operator facts
- source-linked map features

### Modelled or assumed values

Examples:

- tariff
- consumption when not published
- capex
- O&M
- capacity factor
- load profile
- simple payback
- monthly distribution of an annual total

The UI and code should continue to keep these categories visibly separate.

A named company/project in the app does **not** imply:

- the roof is available for a new project
- the site's current bill is known
- the site's approved load is known
- the modelled payback is the operator's actual return
- the mapped geometry is a legal/cadastral boundary

---

## 14. External data and provenance

### Solar

- PVGIS SARAH3 / JRC reference data
- bundled calibration and validation datasets

### Wind

- Global Wind Atlas 3.3
- ERA5 2015–2024 via Open-Meteo archive API
- generated data stored in src/data/wind-uae.json

### Mapping

- OpenStreetMap / Overpass
- Nominatim geocoding
- stored local geometry for demo reliability

### Project facts

Company/developer/authority sources for examples such as:

- Aramex
- ALEC/IKEA
- Al Rawabi
- Masdar UAE Wind Program
- DEWA Hatta

### Regulation

Authority/federal sources described in SOURCES.md and rules.ts.

Every new constant that could be mistaken for measured/published truth should follow the repo's existing provenance discipline: source kind, label, date, and caveat where relevant.

---

## 15. Offline and live-data behaviour

The repository is designed to demo even when dependency installation or network calls fail.

### Standalone page

npm run build / npm run page produce a bundled standalone HTML used by serve.mjs.

### Local server proxies

serve.mjs and Vite define proxy routes for:

- /api/pvgis
- /api/overpass
- /api/geocode

### Important integration caution

Some older docs describe live address search and live PVGIS replacement as if they are guaranteed current user-facing behaviour.

The connector/proxy modules exist, but **current main.ts should be checked for an active caller before presenting a live lookup as integrated.**

This distinction matters: a feature file can exist without being wired into the current UI.

The latest wind recommendation path is safer for demos because the climate dataset is baked into the repository.

---

## 16. Build and edit rules

### Edit these

- src/web/shell.html for shared markup/styles
- src/web/*.ts for UI logic
- src/engine/*.ts for calculations
- src/data/* for source data and configured cases
- tests/* for behavioural coverage
- SOURCES.md when evidence changes

### Do not hand-edit these as source

- root index.html
- dist/index.html
- dist/local.html
- dist/page.html
- dist/assets/*

After source changes:

~~~sh
npm run typecheck
npm test
npm run build
~~~

If physics/yield logic changes, also run:

~~~sh
npm run validate
npm run calibrate
~~~

If wind source data changes:

~~~sh
npx tsx scripts/fetch-wind.ts
~~~

and review the generated provenance metadata before committing.

---

## 17. Testing and validation expectations

A safe change should generally pass:

~~~sh
npm run typecheck
npm test
npm run build
~~~

For calculation changes:

- add a targeted test
- do not change physics merely to satisfy an existing test
- rerun validation
- update validation metrics only when the model intentionally changes
- explain why the output moved

The codebase's comments are part of the engineering communication. They often describe why a modelling choice exists and what it does **not** claim. Preserve that style.

---

## 18. Known limitations and important non-claims

Mizan is a screening prototype, not a bankable engineering package.

It does not replace:

- a structural engineer
- a utility connection study
- a licensed electrical designer
- a wind measurement campaign
- a legal/regulatory opinion
- interval meter data
- supplier quotations
- a cadastral survey
- a geotechnical study
- environmental/aviation/noise approvals
- detailed dispatch/market modelling for utility-scale assets

Specific modelling limits include:

- monthly renewable matching can overestimate savings relative to hourly reality
- custom-site roof capacity is approximate
- custom-site address geolocation can be approximate
- document extraction is text-only and deterministic
- OSM building heights are incomplete in many industrial areas
- neighbour shading with unknown heights is necessarily incomplete
- wind climate is reanalysis/atlas model data, not a mast measurement
- wind wakes/turbulence/terrain effects are simplified
- Hatta pumped storage is storage, not new generation
- hypothetical micro-hydro examples are sensitivity cases, not verified wadi projects
- geothermal electricity remains unsupported without actual subsurface temperature/depth/flow evidence
- published project capacities are not proof of project payback

---

## 19. Current demo path

The current three-minute demo in DEMO.md is the best fast explanation of the product.

Recommended sequence:

1. open UAE examples
2. select Masdar Sir Bani Yas
3. show the Mizan recommendation and legal/evidence status
4. contrast with a Dubai industrial example where wind can be technically workable but blocked by the published scheme path
5. show a strong wind site such as Sila
6. open Analyze your own site
7. upload demo/demo-site-annual-statement.pdf
8. review extracted fields and their document/page provenance
9. confirm
10. show the site's recommendation
11. open the evidence still needed before building
12. point to SOURCES.md

The demo's trust message is as important as the headline number: Mizan should show what is known, what is modelled, what is assumed, and what must still be verified.

---

## 20. Latest repository history that matters

The current main branch was built in a short series of large steps:

- initial Mizan import
- wind-energy/example expansion
- verified UAE climate data + physical wind engine + legal-gated recommender
- Analyze your own site document workflow
- PDF compatibility and approved-load fixes
- UI polish and close-button fixes
- merge of the recommender/custom-site work into main

The latest merge commit is:

**1c9aa2eb9a011e3daa9407d001beed73308cb4ed**

This means the older 24 September DEVIN handoff does **not** fully describe current main.

---

## 21. Context from the two supplied repository snapshots

Two additional zip snapshots were supplied while this context was prepared.

They are useful historical/experimental references but are **not the live GitHub source of truth**.

### mizan-main snapshot

This snapshot contains an alternate/newer-looking resource/intake architecture with files such as:

- src/engine/intake.ts
- src/engine/register.ts
- src/engine/resource.ts
- src/web/engine.worker.ts
- src/web/site-compute.ts
- scripts/bake-resource.ts
- src/data/uae-resource-grid.json

Those files do not exist in the current connected main revision.

Treat them as branch/snapshot ideas unless they are deliberately ported.

### mizan-engine snapshot

This snapshot contains an engine-improvement branch/work order with files such as:

- ENGINE_IMPROVEMENTS.md
- src/engine/analyze.ts
- src/engine/calendar.ts
- src/engine/report.ts
- src/web/pdf-report.ts
- additional chart/live UI work

Its improvement document records a baseline of 83 passing tests and proposes/fixes issues such as:

- shared calendar/date logic
- geometry edge cases
- DNI clamping
- upper MPPT-window checking
- tariff selection using approved load
- obstruction reach filtering
- short-string MPPT collisions
- missing tariff coverage for several emirates
- an engine-level facade
- engine/data dependency layering
- moving planning work off the main thread
- caching solar-year calculations

Do not assume those changes are present in current GitHub main unless the matching file/change exists there.

If future work wants to recover those improvements, review each item against current main first because the recommender/wind/custom-site merge changed the codebase after that snapshot.

---

## 22. Recommended mental model for future development

Think of Mizan as four layers:

### Layer 1 — Evidence

What do we actually know?

- location
- geometry
- bill/load
- approved load
- published project facts
- weather/resource dataset
- utility rules
- source date and confidence

### Layer 2 — Physical/technical model

What could physically fit or generate?

- roof area
- panel packing
- shading
- solar yield
- wind yield
- electrical limits
- structural screen
- battery dispatch

### Layer 3 — Regulatory and financial screen

What is connectable and worth assessing?

- emirate scheme
- approved-load caps
- technology path
- tariff
- capex/O&M
- savings
- payback / lifecycle value

### Layer 4 — Decision UX

What should the user do next?

- recommended mix
- rejected alternatives
- evidence still needed
- source links
- clear distinction between fact, model and assumption

New features should preserve these layers instead of collapsing them into a single opaque score.

---

## 23. Non-negotiable product principles already embedded in the repo

1. **Do not invent missing evidence.**
2. **Do not make a project look viable by quietly changing hurdles or tariffs.**
3. **Do not attach a company name to unrelated geometry.**
4. **Do not treat modelled wind as measured wind.**
5. **Do not treat published capacity as published financial performance.**
6. **Do not recommend a technology through a connection path the rules do not support.**
7. **Do not hide uncertainty because it makes the demo less impressive.**
8. **Keep the calculation path explainable enough that a reviewer can challenge an assumption.**
9. **Keep generated files separate from editable source.**
10. **Rerun tests and validation after calculation changes.**

---

## 24. If you only remember ten things

1. Mizan is a UAE renewable-energy **screening** tool, not a bankable design package.
2. Current main is newer than DEVIN.md.
3. The latest repo includes physical wind, legal gating, recommendations, and local document extraction.
4. The detailed rooftop planner and monthly renewables screen are different calculation paths.
5. Dubai, Abu Dhabi, Sharjah, and EtihadWE emirates are treated differently in the rules engine.
6. Wind uses baked GWA + ERA5 climate data for 27 UAE points and still requires a measurement campaign.
7. User documents are parsed locally and must be confirmed before analysis.
8. Published facts, modelled outputs and assumptions must stay visibly separate.
9. dist and root index.html are generated; edit src instead.
10. Before shipping calculation changes: typecheck, test, build, and rerun validation when physics changes.

---

## 25. Where to start when changing the repo

For product/UI work:

- start with src/web/main.ts
- then src/web/renewable-workspace.ts
- src/web/renewables.ts
- src/web/custom-site.ts
- src/web/shell.html

For rooftop engineering:

- start with src/engine/plan.ts
- then packing.ts, shading.ts, electrical.ts, pv.ts, finance.ts

For recommendation/resource work:

- start with src/engine/recommend.ts
- src/engine/wind.ts
- src/engine/rules.ts
- src/engine/renewable-combinations.ts
- src/data/wind-sites.ts
- src/data/portfolios-uae-multi.ts

For evidence/regulation:

- start with SOURCES.md
- then rules.ts and the relevant src/data case files

For user-upload work:

- start with src/web/custom-site.ts
- then src/engine/extract.ts

For regressions:

- start with tests/engine.test.ts and the smallest test file that owns the affected behaviour.

---

This file should be updated whenever a change alters one of the following:

- a calculation path
- a current user-facing workflow
- the legal rule model
- a primary data source
- the recommendation algorithm
- the current build/run method
- the distinction between active and merely-present modules
