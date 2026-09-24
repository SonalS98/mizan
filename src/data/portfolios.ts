/**
 * Example portfolios.
 *
 * Someone opening this for the first time does not have a company, an
 * electricity account or a roof survey, and asking them to type one in before
 * the tool does anything is a bad first minute. So it opens on a portfolio
 * that is already there.
 *
 * These four operators are invented. The buildings under them are not: every
 * site points at a real footprint in the OpenStreetMap data shipped with this
 * build, with its real area, its real neighbours and, where OSM records one,
 * its real height. The consumption and account figures are typical for the
 * sector and are labelled as such wherever they appear.
 *
 * The portfolios are deliberately mixed. Some sites are obviously worth doing,
 * some are capped, and some should not be built at all. A screening tool that
 * only ever says yes is not screening anything, and the sites it rules out are
 * the ones that show it is doing real work.
 */

import type { CustomerClass, Emirate, RoofConstruction, SectorArchetype } from "../engine/types";

export type PortfolioSite = {
  id: string;
  /** What the operator calls this building. */
  name: string;
  /** Where it is, in words, for someone who does not know the area. */
  where: string;
  sceneId: string;
  buildingIndex: number;
  emirate: Emirate;
  customerClass: CustomerClass;
  sector: SectorArchetype;
  /** Metered consumption over the last year, kWh. */
  annualKwh: number;
  /**
   * Approved Load on the electricity account, kW. This is the single most
   * important number on a UAE rooftop project and the one nobody expects:
   * Shams Dubai will not let a plot install more solar than its approved load.
   */
  approvedLoadKw: number;
  roofConstruction: RoofConstruction;
  /** Height above ground, metres, where it is known. */
  roofHeightM: number | null;
  /** One line on what this building does, in plain words. */
  note: string;
};

export type Portfolio = {
  id: string;
  name: string;
  /** What kind of business this is. */
  kind: string;
  /** The question this operator is actually asking. */
  question: string;
  /**
   * The payback this operator's board will sign off, in years. Anything slower
   * is ruled out for them even though it would pay back eventually.
   *
   * This is why sites get ruled out here rather than by inventing a technical
   * failure. Rooftop solar in the UAE nearly always pays back sooner or later:
   * the tariff is high and the sun is relentless. The real question an owner
   * faces is not whether a roof works, it is which roofs clear their hurdle
   * and what to do about the rest, so the hurdle is stated and applied rather
   * than hidden.
   */
  hurdleYears: number;
  sites: PortfolioSite[];
};

const warehouse = (kwhPerM2: number, areaM2: number) => Math.round((kwhPerM2 * areaM2) / 1000) * 1000;

export const PORTFOLIOS: Portfolio[] = [
  {
    id: "khaleej",
    name: "Khaleej Logistics",
    kind: "Third-party warehousing and distribution",
    question:
      "We have seven sheds and a budget for two. Which two, and why not the others?",
    hurdleYears: 5,
    sites: [
      {
        id: "kl-1",
        name: "Jebel Ali DC1",
        where: "Jebel Ali Free Zone, Dubai",
        sceneId: "jafza",
        buildingIndex: 0,
        emirate: "dubai",
        customerClass: "industrial",
        sector: "warehouse",
        annualKwh: warehouse(214, 23550),
        approvedLoadKw: 1400,
        roofConstruction: "concrete",
        roofHeightM: 12,
        note: "The main distribution centre. Largest roof in the portfolio, runs two shifts.",
      },
      {
        id: "kl-2",
        name: "Jebel Ali DC2",
        where: "Jebel Ali Free Zone, Dubai",
        sceneId: "jafza",
        buildingIndex: 1,
        emirate: "dubai",
        customerClass: "industrial",
        sector: "warehouse",
        annualKwh: warehouse(160, 15460),
        approvedLoadKw: 900,
        roofConstruction: "steel-deck",
        roofHeightM: 11,
        note: "Ambient storage next door to DC1, lighter electrical load.",
      },
      {
        id: "kl-3",
        name: "Jebel Ali cross-dock",
        where: "Jebel Ali Free Zone, Dubai",
        sceneId: "jafza",
        buildingIndex: 2,
        emirate: "dubai",
        customerClass: "industrial",
        sector: "warehouse",
        annualKwh: warehouse(96, 14017),
        approvedLoadKw: 400,
        roofConstruction: "sandwich-panel",
        roofHeightM: 9,
        note: "Fast-turn cross-dock. Lightweight insulated roof, put up in 2019.",
      },
      {
        id: "kl-4",
        name: "DIC parts hub",
        where: "Dubai Industrial City",
        sceneId: "dic",
        buildingIndex: 0,
        emirate: "dubai",
        customerClass: "industrial",
        sector: "factory-2shift",
        annualKwh: warehouse(228, 45356),
        approvedLoadKw: 3200,
        roofConstruction: "concrete",
        roofHeightM: 14,
        note: "Largest site by area. Light assembly and spares, two shifts.",
      },
      {
        id: "kl-5",
        name: "DIC returns centre",
        where: "Dubai Industrial City",
        sceneId: "dic",
        buildingIndex: 2,
        emirate: "dubai",
        customerClass: "industrial",
        sector: "warehouse",
        annualKwh: warehouse(140, 27178),
        approvedLoadKw: 1600,
        roofConstruction: "steel-deck",
        roofHeightM: 12,
        note: "Reverse logistics and refurbishment.",
      },
      {
        id: "kl-6",
        name: "DIC overflow shed",
        where: "Dubai Industrial City",
        sceneId: "dic",
        buildingIndex: 5,
        emirate: "dubai",
        customerClass: "industrial",
        sector: "warehouse",
        annualKwh: warehouse(5, 18360),
        approvedLoadKw: 60,
        roofConstruction: "steel-deck",
        roofHeightM: 11,
        note: "Seasonal overflow. Unheated, barely lit, and standing empty eight months of the year.",
      },
      {
        id: "kl-7",
        name: "Jebel Ali yard office",
        where: "Jebel Ali Free Zone, Dubai",
        sceneId: "jafza",
        buildingIndex: 8,
        emirate: "dubai",
        customerClass: "commercial",
        sector: "office",
        annualKwh: warehouse(190, 6286),
        approvedLoadKw: 500,
        roofConstruction: "concrete",
        roofHeightM: 10,
        note: "Site office and driver facilities for the Jebel Ali yard.",
      },
    ],
  },
  {
    id: "mina",
    name: "Mina Cold Chain",
    kind: "Temperature-controlled storage and distribution",
    question:
      "Refrigeration runs all day and our bills are brutal. How much can the roofs take off them?",
    hurdleYears: 6,
    sites: [
      {
        id: "mc-1",
        name: "Jebel Ali cold store",
        where: "Jebel Ali Free Zone, Dubai",
        sceneId: "jafza",
        buildingIndex: 3,
        emirate: "dubai",
        customerClass: "industrial",
        sector: "cold-store",
        annualKwh: warehouse(470, 11443),
        approvedLoadKw: 2000,
        roofConstruction: "concrete",
        roofHeightM: 13,
        note: "Chilled and frozen chambers, compressors running around the clock.",
      },
      {
        id: "mc-2",
        name: "Jebel Ali blast freezer",
        where: "Jebel Ali Free Zone, Dubai",
        sceneId: "jafza",
        buildingIndex: 4,
        emirate: "dubai",
        customerClass: "industrial",
        sector: "cold-store",
        annualKwh: warehouse(520, 11284),
        approvedLoadKw: 2080,
        roofConstruction: "concrete",
        roofHeightM: 13,
        note: "Blast freezing and hardening. The heaviest electrical load per square metre we have.",
      },
      {
        id: "mc-3",
        name: "DIC chilled hub",
        where: "Dubai Industrial City",
        sceneId: "dic",
        buildingIndex: 3,
        emirate: "dubai",
        customerClass: "industrial",
        sector: "cold-store",
        annualKwh: warehouse(430, 21377),
        approvedLoadKw: 2600,
        roofConstruction: "concrete",
        roofHeightM: 13,
        note: "Chilled distribution for the northern emirates.",
      },
      {
        id: "mc-4",
        name: "DIC dry annexe",
        where: "Dubai Industrial City",
        sceneId: "dic",
        buildingIndex: 8,
        emirate: "dubai",
        customerClass: "industrial",
        sector: "warehouse",
        annualKwh: warehouse(110, 16668),
        approvedLoadKw: 800,
        roofConstruction: "steel-deck",
        roofHeightM: 11,
        note: "Ambient goods alongside the chilled hub.",
      },
      {
        id: "mc-5",
        name: "DIC packing hall",
        where: "Dubai Industrial City",
        sceneId: "dic",
        buildingIndex: 6,
        emirate: "dubai",
        customerClass: "industrial",
        sector: "factory-24h",
        annualKwh: warehouse(305, 16840),
        approvedLoadKw: 1900,
        roofConstruction: "concrete",
        roofHeightM: 12,
        note: "Continuous packing and labelling, three shifts.",
      },
    ],
  },
  {
    id: "arjaan",
    name: "Arjaan Estates",
    kind: "Commercial property, offices and retail",
    question:
      "The board wants solar on the whole portfolio. Which buildings can actually take it?",
    hurdleYears: 6,
    sites: [
      {
        id: "ar-1",
        name: "Bay Podium",
        where: "Business Bay, Dubai",
        sceneId: "business-bay",
        buildingIndex: 0,
        emirate: "dubai",
        customerClass: "commercial",
        sector: "retail",
        annualKwh: warehouse(240, 67846),
        approvedLoadKw: 4500,
        roofConstruction: "concrete",
        roofHeightM: 8,
        note: "Retail podium with the largest roof anywhere in the portfolio, ringed by towers.",
      },
      {
        id: "ar-2",
        name: "Bay Tower West",
        where: "Business Bay, Dubai",
        sceneId: "business-bay",
        buildingIndex: 9,
        emirate: "dubai",
        customerClass: "commercial",
        sector: "office",
        annualKwh: warehouse(215, 6711),
        approvedLoadKw: 1100,
        roofConstruction: "concrete",
        roofHeightM: 67,
        note: "Offices over nineteen floors. Small roof, but it sits above most of its neighbours.",
      },
      {
        id: "ar-3",
        name: "Bay Courtyard",
        where: "Business Bay, Dubai",
        sceneId: "business-bay",
        buildingIndex: 5,
        emirate: "dubai",
        customerClass: "commercial",
        sector: "office",
        annualKwh: warehouse(205, 8265),
        approvedLoadKw: 950,
        roofConstruction: "concrete",
        roofHeightM: 16,
        note: "Low-rise offices around a courtyard, with a tower over the road.",
      },
      {
        id: "ar-4",
        name: "Bay Annexe",
        where: "Business Bay, Dubai",
        sceneId: "business-bay",
        buildingIndex: 4,
        emirate: "dubai",
        customerClass: "commercial",
        sector: "office",
        annualKwh: warehouse(198, 8914),
        approvedLoadKw: 900,
        roofConstruction: "concrete",
        roofHeightM: 15,
        note: "Serviced offices and meeting suites.",
      },
      {
        id: "ar-5",
        name: "Jebel Ali trade counter",
        where: "Jebel Ali Free Zone, Dubai",
        sceneId: "jafza",
        buildingIndex: 6,
        emirate: "dubai",
        customerClass: "commercial",
        sector: "retail",
        annualKwh: warehouse(22, 8559),
        approvedLoadKw: 150,
        roofConstruction: "steel-deck",
        roofHeightM: 10,
        note: "Trade counter and showroom, open six hours a day to trade customers only.",
      },
      {
        id: "ar-6",
        name: "DIC light industrial",
        where: "Dubai Industrial City",
        sceneId: "dic",
        buildingIndex: 4,
        emirate: "dubai",
        customerClass: "industrial",
        sector: "factory-2shift",
        annualKwh: warehouse(185, 19034),
        approvedLoadKw: 1500,
        roofConstruction: "unknown",
        roofHeightM: null,
        note: "Let to a printing business. We have never seen the structural drawings.",
      },
    ],
  },
];

/**
 * What every input actually means, in the words someone would use who has
 * never bought a solar system. Shown against each field rather than hidden in
 * a help page, because the ones that decide the answer are exactly the ones
 * nobody outside the industry has heard of.
 */
export const GLOSSARY: Record<string, { term: string; plain: string; whyItMatters: string }> = {
  approvedLoad: {
    term: "Approved Load",
    plain:
      "The maximum power the utility has agreed this plot may draw, written on the electricity account. Measured in kilowatts.",
    whyItMatters:
      "Under Shams Dubai you may not install more solar than your approved load, whatever the roof could hold. On most large sheds this, and not the roof, is what sets the size.",
  },
  annualKwh: {
    term: "Annual consumption",
    plain: "How many kilowatt-hours the site bought from the grid over the last twelve months.",
    whyItMatters:
      "Solar is worth most when it is used on site rather than exported, so what the building uses during daylight is what decides the value. Twelve monthly readings beat one annual figure.",
  },
  sector: {
    term: "What the building does",
    plain:
      "Warehouse, cold store, factory, office, retail or data hall. Picks the shape of the day: when the building actually draws power.",
    whyItMatters:
      "A cold store draws the same power at 3am as at noon. An office is empty by seven. The same roof and the same sun are worth very different money depending on which one it is.",
  },
  roofConstruction: {
    term: "How the roof is built",
    plain: "Reinforced concrete, profiled steel deck, insulated sandwich panel, or not known.",
    whyItMatters:
      "This is the most common reason a UAE rooftop project dies after the numbers already looked good. Sandwich panel rarely takes the extra load without strengthening.",
  },
  roofHeight: {
    term: "Roof height",
    plain: "How far the roof stands above the ground, in metres.",
    whyItMatters:
      "A neighbour only shades a roof by the part of it standing above that roof. Without this height, nothing can be said about what the buildings around it block.",
  },
  tariff: {
    term: "Tariff",
    plain: "What the utility charges per unit, including the slab structure and the fuel surcharge.",
    whyItMatters:
      "DEWA and ADDC price very differently, and industrial tariffs step up above a threshold. The saving is what you avoid paying, so the tariff is the whole answer.",
  },
};
