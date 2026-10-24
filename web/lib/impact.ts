/**
 * Heat-island, energy and capital-cost metrics (tasks/plan.md). Pure. All values are estimates.
 * Ranges combine component-wise: low × low, central × central, high × high.
 */
import { footprintPerimeterM } from "@/lib/geo";
import { TILE_AREA_M2 } from "@/lib/grid";
import {
  CATALOG,
  GREEN_WALL_COVER_HEIGHT_M,
  type CostLine,
  type Energy,
  type Range,
} from "@/lib/interventions";
import type { Action, ActionTarget, BuildingIntervention, CellTemps, SelectedBuilding } from "@/lib/types";

// ---------- heat island ----------

export interface Baseline {
  /** Citywide mean 3pm air over tiles with data, °F. */
  air: number;
  /** Citywide mean surface temperature over tiles with data, °F. */
  surface: number;
}

const mean = (vs: (number | null)[]) => {
  let s = 0;
  let n = 0;
  for (const v of vs) {
    if (v === null) continue;
    s += v;
    n++;
  }
  return n ? s / n : Number.NaN;
};

/** Computed once from the base data; never recomputed after actions. */
export function computeBaseline(tiles: readonly CellTemps[]): Baseline {
  return { air: mean(tiles.map((h) => h.temp3pm)), surface: mean(tiles.map((h) => h.surface)) };
}

/** Heat island H = T − citywide mean, °F. */
export const heatIslandF = (t: number | null, baselineMean: number): number | null =>
  t === null ? null : t - baselineMean;

/** Tiles at or below this heat island (°F) get no percentage: it would be unstable or meaningless. */
export const HEAT_ISLAND_MIN_F = 0.5;

/** (H_before − H_after) ÷ H_before × 100; null (n/a) when H_before ≤ 0.5 °F or a value is missing. */
export function heatIslandChangePct(before: number | null, after: number | null): number | null {
  if (before === null || after === null || before <= HEAT_ISLAND_MIN_F) return null;
  return ((before - after) / before) * 100;
}

// ---------- ranges ----------

const range = (low: number, central: number, high: number): Range => ({ low, central, high });
const scale = (r: Range, k: number) => range(r.low * k, r.central * k, r.high * k);
const mul = (a: Range, b: Range) => range(a.low * b.low, a.central * b.central, a.high * b.high);
const add = (a: Range, b: Range) => range(a.low + b.low, a.central + b.central, a.high + b.high);
export const ZERO: Range = range(0, 0, 0);

export type Estimate = { kind: "range"; value: Range } | { kind: "not-quantified"; reason: string };
const est = (value: Range): Estimate => ({ kind: "range", value });
const nq = (reason: string): Estimate => ({ kind: "not-quantified", reason });

// ---------- quantities ----------

/** Solar usable roof share by footprint size class (Gagnon et al. 2016). */
export function solarRoofShare(e: Extract<Energy, { kind: "solar" }>, roofAreaM2: number): number {
  if (roofAreaM2 < e.sizeThresholdsM2.small) return e.roofShare.small;
  if (roofAreaM2 > e.sizeThresholdsM2.large) return e.roofShare.large;
  return e.roofShare.medium;
}

const SOLAR = CATALOG.solar.energy as Extract<Energy, { kind: "solar" }>;

/** Installed PV, kW DC. */
export const solarKw = (b: SelectedBuilding): Range =>
  scale(SOLAR.kwPerM2, b.roofAreaM2 * solarRoofShare(SOLAR, b.roofAreaM2));

/** Green-wall area, m²: outer perimeter × the covered height (assumption). Null without a height. */
export function greenWallAreaM2(b: SelectedBuilding): number | null {
  if (b.heightM === null) return null;
  return footprintPerimeterM(b.footprint) * Math.min(b.heightM, GREEN_WALL_COVER_HEIGHT_M);
}

function quantity(line: CostLine, target: ActionTarget): Range | string {
  switch (line.unit) {
    case "$/m² roof":
      return target.kind === "building" ? scale(range(1, 1, 1), target.building.roofAreaM2) : "needs a building";
    case "$/W":
      return target.kind === "building" ? scale(solarKw(target.building), 1000) : "needs a building";
    case "$/m² wall": {
      if (target.kind !== "building") return "needs a building";
      const a = greenWallAreaM2(target.building);
      return a === null ? "building height unknown" : scale(range(1, 1, 1), a);
    }
    case "$/m² ground":
      return target.kind === "area" ? scale(range(1, 1, 1), new Set(target.cells).size * TILE_AREA_M2) : "needs an area";
  }
}

/** Capital cost, USD: the sum of cost lines (so green roof + solar is the sum of its parts). */
export function capitalCost(action: Action): Estimate {
  let total = ZERO;
  for (const line of CATALOG[action.intervention].costPerUnit) {
    const q = quantity(line, action.target);
    if (typeof q === "string") return nq(q);
    total = add(total, mul(line, q));
  }
  return est(total);
}

// ---------- energy ----------

export interface EnergyEstimate {
  /** Annual electricity, kWh/yr (generated for solar, saved for roofs). */
  kwh: Estimate;
  /** Annual value, $/yr. */
  usd: Estimate;
}

const NONE: EnergyEstimate = { kwh: nq("No energy effect claimed."), usd: nq("No energy effect claimed.") };

function partEnergy(id: Exclude<BuildingIntervention, "green-roof-solar"> | "street-trees", target: ActionTarget): EnergyEstimate {
  const e = CATALOG[id].energy;
  const roof = target.kind === "building" ? target.building.roofAreaM2 : 0;
  switch (e.kind) {
    case "none":
      return NONE;
    case "not-quantified":
      return { kwh: nq(e.reason), usd: nq(e.reason) };
    case "kwh-per-m2": {
      const kwh = scale(e.perM2, roof);
      return { kwh: est(kwh), usd: est(scale(kwh, SOLAR.rateUsdPerKwh)) };
    }
    case "usd-per-m2":
      return { kwh: nq("Source gives dollars only, not kWh."), usd: est(scale(e.perM2, roof)) };
    case "solar": {
      if (target.kind !== "building") return NONE;
      const kwh = mul(solarKw(target.building), e.kwhPerKwYear);
      return { kwh: est(kwh), usd: est(scale(kwh, e.rateUsdPerKwh)) };
    }
  }
}

/** Sum two estimates; a not-quantified part is skipped if the other part is quantified. */
function sumEst(a: Estimate, b: Estimate): Estimate {
  if (a.kind === "range" && b.kind === "range") return est(add(a.value, b.value));
  if (a.kind === "range") return a;
  if (b.kind === "range") return b;
  return a;
}

export function energyEstimate(action: Action): EnergyEstimate {
  const spec = CATALOG[action.intervention];
  if (!spec.parts) return partEnergy(action.intervention as Parameters<typeof partEnergy>[0], action.target);
  return spec.parts
    .map((p) => partEnergy(p as Parameters<typeof partEnergy>[0], action.target))
    .reduce((a, b) => ({ kwh: sumEst(a.kwh, b.kwh), usd: sumEst(a.usd, b.usd) }));
}

// ---------- totals ----------

export interface ActionMetrics {
  capital: Estimate;
  energy: EnergyEstimate;
}

export interface Totals {
  capital: Range;
  kwh: Range;
  usd: Range;
  /** Actions whose capital cost is not quantified (excluded from `capital`). */
  capitalNotQuantified: number;
}

export const actionMetrics = (a: Action): ActionMetrics => ({ capital: capitalCost(a), energy: energyEstimate(a) });

export function totals(actions: readonly Action[]): Totals {
  const t: Totals = { capital: ZERO, kwh: ZERO, usd: ZERO, capitalNotQuantified: 0 };
  for (const a of actions) {
    const m = actionMetrics(a);
    if (m.capital.kind === "range") t.capital = add(t.capital, m.capital.value);
    else t.capitalNotQuantified++;
    if (m.energy.kwh.kind === "range") t.kwh = add(t.kwh, m.energy.kwh.value);
    if (m.energy.usd.kind === "range") t.usd = add(t.usd, m.energy.usd.value);
  }
  return t;
}
