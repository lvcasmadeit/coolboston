/**
 * Intervention catalog: the only place cost, cooling, surface and energy numbers live.
 * Every value comes from the inputs table in tasks/plan.md (Task 14) or is labelled an assumption.
 * Ranges are low / central / high. All values are estimates.
 */
import {
  AREA_INTERVENTIONS,
  BUILDING_INTERVENTIONS,
  type AreaIntervention,
  type BuildingIntervention,
  type Intervention,
} from "@/lib/types";

export interface Range {
  low: number;
  central: number;
  high: number;
}

export type CostUnit = "$/m² roof" | "$/m² wall" | "$/W" | "$/m² ground";

export interface CostLine extends Range {
  unit: CostUnit;
}

/** CellTemps-level effect at full share (s = 1); scaled by the treated share in the impact model. */
export interface Effect {
  /** °F per unit share. 0 = no effect. null = not quantified. */
  deltaFPerShare: number | null;
  basis: string;
}

export type Energy =
  | { kind: "none" }
  | { kind: "not-quantified"; reason: string }
  /** Annual cooling electricity saving per m² of treated roof. */
  | { kind: "kwh-per-m2"; perM2: Range }
  /** Annual bill saving per m² of treated roof (source gives dollars, not kWh). */
  | { kind: "usd-per-m2"; perM2: Range }
  | {
      kind: "solar";
      /** Usable share of the footprint, chosen by building size. */
      roofShare: { small: number; medium: number; large: number };
      /** Footprint thresholds in m² for small (<) and large (>). */
      sizeThresholdsM2: { small: number; large: number };
      kwPerM2: Range;
      kwhPerKwYear: Range;
      /** $/kWh, Massachusetts commercial. */
      rateUsdPerKwh: number;
    };

export interface Source {
  citation: string;
  url: string;
}

export interface InterventionSpec {
  id: Intervention;
  label: string;
  appliesTo: "building" | "area";
  /** Counts against the one-roof-action-per-building rule. */
  roofAction: boolean;
  /** Set only on combined actions. Their costs are the sum of the parts. */
  parts?: readonly BuildingIntervention[];
  costPerUnit: readonly CostLine[];
  airCoefficient: Effect;
  surfaceChange: Effect;
  energy: Energy;
  sources: readonly Source[];
  note: string;
}

const FT2_PER_M2 = 10.763910417;
const perFt2 = (low: number, central: number, high: number, unit: CostUnit): CostLine => ({
  low: low * FT2_PER_M2,
  central: central * FT2_PER_M2,
  high: high * FT2_PER_M2,
  unit,
});
const cToF = (dc: number) => (dc * 9) / 5;

/** Assumption, not sourced: albedo gain of a cool roof coating. Levinson & Akbari 2010 use 0.35. */
export const COOL_ROOF_ALBEDO_CHANGE = 0.3;

/** Assumption, not sourced: a green wall covers the lowest 10 m of the whole outer facade. */
export const GREEN_WALL_COVER_HEIGHT_M = 10;

const SRC = {
  smith2025: {
    citation: "Smith et al. 2025, Communications Earth & Environment 6:507",
    url: "https://www.nature.com/articles/s43247-025-02462-3",
  },
  epaGreen: {
    citation: "US EPA, Using Green Roofs to Reduce Heat Islands",
    url: "https://www.epa.gov/heatislands/using-green-roofs-reduce-heat-islands",
  },
  epaGreen2019: {
    citation: "US EPA, Using Green Roofs to Reduce Heat Islands (2019 snapshot)",
    url: "https://19january2021snapshot.epa.gov/heatislands/using-green-roofs-reduce-heat-islands_.html",
  },
  epaCool: {
    citation: "US EPA, Using Cool Roofs to Reduce Heat Islands",
    url: "https://www.epa.gov/heatislands/using-cool-roofs-reduce-heat-islands",
  },
  levinson2010: {
    citation: "Levinson & Akbari 2010, Energy Efficiency 3:53-109",
    url: "https://eta-publications.lbl.gov/publications/potential-benefits-cool-roofs",
  },
  nemr2026: {
    citation: "New England Metal Roof 2026; HomeGuide; HomeAdvisor (vendor and consumer cost ranges)",
    url: "https://newenglandmetalroof.com/",
  },
  greenWallCost: {
    citation: "designerplants.com; instantjungle; illustrarch.com; buildwithrise.com (mostly indoor systems)",
    url: "https://www.designerplants.com/",
  },
  tts2024: {
    citation: "LBNL Tracking the Sun 2024, small non-residential state medians",
    url: "https://eta-publications.lbl.gov/sites/default/files/2024-08/tracking_the_sun_2024_executive_summary.pdf",
  },
  gagnon2016: {
    citation: "Gagnon et al. 2016, NREL/TP-6A20-65298, rooftop PV technical potential",
    url: "https://www.nlr.gov/docs/fy16osti/65298.pdf",
  },
  pvwatts: {
    citation: "NREL PVWatts v8, Boston (42.36, -71.06), tilt 15-30°",
    url: "https://pvwatts.nlr.gov/",
  },
  eia: {
    citation: "EIA Electric Power Monthly Table 5.6.B, Massachusetts commercial, YTD June 2026",
    url: "https://www.eia.gov/electricity/monthly/epm_table_grapher.cfm?t=epmt_5_6_b",
  },
  usfsNE: {
    citation: "USDA Forest Service, Northeast Community Tree Guide (PSW-GTR-202, 2007)",
    url: "https://www.fs.usda.gov/psw/publications/documents/psw_gtr202/psw_gtr202.pdf",
  },
} as const satisfies Record<string, Source>;

const NO_EFFECT: Effect = { deltaFPerShare: 0, basis: "No air or surface cooling claimed." };

const GREEN_ROOF_COST = perFt2(10, 18, 30, "$/m² roof");
const COOL_ROOF_COST = perFt2(1.5, 3, 5, "$/m² roof");
const GREEN_WALL_COST = perFt2(95, 165, 265, "$/m² wall");
const SOLAR_COST: CostLine = { low: 2.6, central: 3.35, high: 4.1, unit: "$/W" };
// $300 / $400 / $450 per tree ÷ 59.5 m² crown × 0.10 canopy gain over the selected ground.
const TREE_CROWN_M2 = 59.5;
const TREE_CANOPY_GAIN = 0.1;
const TREE_COST: CostLine = {
  low: (300 / TREE_CROWN_M2) * TREE_CANOPY_GAIN,
  central: (400 / TREE_CROWN_M2) * TREE_CANOPY_GAIN,
  high: (450 / TREE_CROWN_M2) * TREE_CANOPY_GAIN,
  unit: "$/m² ground",
};

const GREEN_ROOF_AIR: Effect = {
  deltaFPerShare: -5,
  basis: "Up to -5 °F citywide (EPA 2019); used as an upper-bound proxy at tile scale.",
};
const GREEN_ROOF_SURFACE: Effect = {
  deltaFPerShare: -56,
  basis: "Roof surface up to 56 °F cooler than a conventional roof (EPA, peak summer).",
};

const SOLAR_ENERGY: Energy = {
  kind: "solar",
  roofShare: { small: 0.26, medium: 0.49, large: 0.66 },
  // Gagnon 2016 size classes: small < 5,000 ft², large > 25,000 ft².
  sizeThresholdsM2: { small: 5000 / FT2_PER_M2, large: 25000 / FT2_PER_M2 },
  kwPerM2: { low: 0.112, central: 0.126, high: 0.14 },
  kwhPerKwYear: { low: 1268, central: 1305, high: 1341 },
  rateUsdPerKwh: 0.2466,
};

export const CATALOG: Record<Intervention, InterventionSpec> = {
  solar: {
    id: "solar",
    label: "Solar panels",
    appliesTo: "building",
    roofAction: true,
    costPerUnit: [SOLAR_COST],
    airCoefficient: NO_EFFECT,
    surfaceChange: NO_EFFECT,
    energy: SOLAR_ENERGY,
    sources: [SRC.tts2024, SRC.gagnon2016, SRC.pvwatts, SRC.eia],
    note: "Generates electricity; no cooling effect is claimed.",
  },
  "green-roof": {
    id: "green-roof",
    label: "Green roof",
    appliesTo: "building",
    roofAction: true,
    costPerUnit: [GREEN_ROOF_COST],
    airCoefficient: GREEN_ROOF_AIR,
    surfaceChange: GREEN_ROOF_SURFACE,
    energy: { kind: "usd-per-m2", perM2: { low: 0.4, central: 0.65, high: 0.9 } },
    sources: [SRC.epaGreen2019, SRC.epaGreen, SRC.nemr2026],
    note: "Air effect is an upper bound. Energy saving is in dollars only (EPA gives no kWh).",
  },
  "cool-building": {
    id: "cool-building",
    label: "Cool building (roof)",
    appliesTo: "building",
    roofAction: true,
    costPerUnit: [COOL_ROOF_COST],
    airCoefficient: {
      deltaFPerShare: cToF(-0.61 * (COOL_ROOF_ALBEDO_CHANGE / 0.1)),
      basis: `-0.61 °C per +0.1 albedo (Smith et al. 2025) × assumed +${COOL_ROOF_ALBEDO_CHANGE} roof albedo.`,
    },
    surfaceChange: {
      deltaFPerShare: -55,
      basis: "Roof surface 50-60 °F cooler (EPA, peak summer); midpoint used.",
    },
    energy: { kind: "kwh-per-m2", perM2: { low: 3.3, central: 5.02, high: 7.69 } },
    sources: [SRC.smith2025, SRC.epaCool, SRC.levinson2010, SRC.nemr2026],
    note: "Albedo change of 0.3 is an assumption. Energy range spans US states; Boston likely sits near the low end.",
  },
  "green-walls": {
    id: "green-walls",
    label: "Green walls",
    appliesTo: "building",
    roofAction: false,
    costPerUnit: [GREEN_WALL_COST],
    airCoefficient: NO_EFFECT,
    surfaceChange: NO_EFFECT,
    energy: { kind: "not-quantified", reason: "No per m² source for a temperate climate." },
    sources: [SRC.greenWallCost],
    note: `Can be added alongside any roof action. Covers the lowest ${GREEN_WALL_COVER_HEIGHT_M} m of the facade (assumption). Costs are mostly for indoor systems (low confidence).`,
  },
  "green-roof-solar": {
    id: "green-roof-solar",
    label: "Green roof + solar",
    appliesTo: "building",
    roofAction: true,
    parts: ["green-roof", "solar"],
    costPerUnit: [GREEN_ROOF_COST, SOLAR_COST],
    airCoefficient: GREEN_ROOF_AIR,
    surfaceChange: GREEN_ROOF_SURFACE,
    energy: SOLAR_ENERGY,
    sources: [SRC.epaGreen2019, SRC.epaGreen, SRC.nemr2026, SRC.tts2024, SRC.gagnon2016, SRC.pvwatts, SRC.eia],
    note: "Counts as one roof action. Cooling from the green roof, energy from the solar part.",
  },
  "street-trees": {
    id: "street-trees",
    label: "Street trees",
    appliesTo: "area",
    roofAction: false,
    costPerUnit: [TREE_COST],
    airCoefficient: {
      deltaFPerShare: cToF(-0.07),
      basis: "-0.07 °C per +0.1 canopy fraction (Smith et al. 2025); +0.10 canopy over the selected share.",
    },
    surfaceChange: { deltaFPerShare: null, basis: "Not quantified." },
    energy: { kind: "not-quantified", reason: "Building energy effect of street trees not sourced." },
    sources: [SRC.smith2025, SRC.usfsNE],
    note: "Planting cost in 2007 dollars; one tree ≈ 59.5 m² mature crown.",
  },
};

export const buildingActions = (): InterventionSpec[] => BUILDING_INTERVENTIONS.map((id) => CATALOG[id]);
export const areaActions = (): InterventionSpec[] => AREA_INTERVENTIONS.map((id) => CATALOG[id]);

export type { AreaIntervention, BuildingIntervention };
