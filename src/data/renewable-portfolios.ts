import { PUBLISHED_WAREHOUSES } from "./published-warehouses";
import { MAPPED_ENERGY_PROJECTS } from "./mapped-energy-projects";
import { UAE_RENEWABLE_CASES, type RenewableCase } from "./portfolios-uae-multi";

export type RenewablePortfolioSite = RenewableCase & { approvedLoadKw: number | null };
export type RenewablePortfolio = {
  id: string; name: string; kind: string; question: string; hurdleYears: number;
  sites: RenewablePortfolioSite[];
};

/** The four portfolios embedded, but never registered, in the supplied page.html.
 * Reuse explicit resource assumptions; do not import its unsupported MERRA-2
 * claims or attach missing scene IDs to unrelated building footprints. */
function site(id: string, reference: string, name: string, annualKwh: number, approvedLoadKw: number,
  overrides: Partial<RenewableCase> = {}): RenewablePortfolioSite {
  const base = UAE_RENEWABLE_CASES.find(s => s.id === reference);
  if (!base) throw new Error(`Missing renewable case ${reference}`);
  return { ...base, id, name, annualKwh, approvedLoadKw,
    solarKw: Math.min(base.solarKw, approvedLoadKw), ...overrides };
}

export const RENEWABLE_PORTFOLIOS: RenewablePortfolio[] = [
  MAPPED_ENERGY_PROJECTS,
  PUBLISHED_WAREHOUSES,
  {
    id: "solar-only", name: "Inland Solar Focus", kind: "Standard industrial and logistics", hurdleYears: 5,
    question: "Our warehouses are inland, with no assessed wind or water resource. What can solar alone deliver?",
    sites: [
      site("so-1", "dic-solar", "Dubai Industrial City – Warehouse Hub", 2_400_000, 800),
      site("so-2", "sharjah-solar", "Sharjah Manufacturing Zone – Factory", 3_800_000, 1200, { solarKw: 1200 }),
      site("so-3", "ajman-solar", "Ajman Logistics Center", 1_200_000, 400, { solarKw: 400 }),
    ],
  },
  {
    id: "solar-wind", name: "Coastal + Wind Portfolio", kind: "Coastal industrial, petrochemical, ports", hurdleYears: 6,
    question: "Should we mix wind with solar? Which sites benefit most from each source?",
    sites: [
      site("sw-1", "jebel-ali-mix", "Jebel Ali Port Terminal Operations", 2_800_000, 900),
      site("sw-2", "ruwais-mix", "Abu Dhabi Ruwais Petrochemical Complex", 12_000_000, 3500),
      site("sw-3", "fujairah-mix", "Fujairah Cement Plant", 4_500_000, 1400, { solarKw: 1400 }),
      site("sw-4", "khorfakkan-mix", "Khor Fakkan Port Operations", 1_200_000, 380),
      site("sw-5", "rak-mix", "Ras Al Khaimah Mountain Manufacturing", 2_100_000, 650,
        { where: "Jebel Jais foothills, Ras Al Khaimah", location: { lat: 25.85, lng: 56.03 } }),
      site("sw-6", "rak-mix", "RAK Ceramic Factory", 2_800_000, 850),
    ],
  },
  {
    id: "wind-only", name: "Wind Specialist (Rare Case)", kind: "High-elevation sensitivity case", hurdleYears: 7,
    question: "With limited roof space, how much could wind deliver alone?",
    sites: [site("wo-1", "jais-wind", "Jebel Jais Summit Facility (Thought Experiment)", 500_000, 150)],
  },
  {
    id: "solar-microhydro", name: "Wadi-Adjacent (Seasonal)", kind: "Seasonal water availability", hurdleYears: 7,
    question: "Could seasonal recoverable water flow supplement solar in winter?",
    sites: [
      site("sm-1", "wadi-ham", "Wadi Ham Facility", 800_000, 250, { solarKw: 250 }),
      site("sm-2", "wadi-ham", "Wadi Ham Water Treatment Facility", 600_000, 180, { solarKw: 180 }),
    ],
  },
];
