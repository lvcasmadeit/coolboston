/** Display formatting for estimates. */
import type { Range } from "@/lib/interventions";
import type { Estimate } from "@/lib/impact";

export const M2_TO_FT2 = 10.763910417;
export const M2_PER_ACRE = 4046.8564224;

const compactUsd = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e6) return `$${(v / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(a >= 1e4 ? 0 : 1)}k`;
  return `$${v.toFixed(0)}`;
};

const compactNum = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e4) return `${(v / 1e3).toFixed(0)}k`;
  return Math.round(v).toLocaleString("en-US");
};

/** "$12k–$34k" */
export const formatUsdRange = (r: Range) => `${compactUsd(r.low)}–${compactUsd(r.high)}`;

/** "1,200–1,500 kWh" */
export const formatNumRange = (r: Range, unit: string) => `${compactNum(r.low)}–${compactNum(r.high)} ${unit}`;

export function formatEstimate(e: Estimate, fmt: (r: Range) => string): string {
  return e.kind === "range" ? fmt(e.value) : "not quantified";
}

/** "1,267 m² (13,638 ft²)" */
export const formatArea = (m2: number) =>
  `${Math.round(m2).toLocaleString("en-US")} m² (${Math.round(m2 * M2_TO_FT2).toLocaleString("en-US")} ft²)`;

export const formatAcres = (m2: number) => `${(m2 / M2_PER_ACRE).toFixed(1)} acres`;

/** Signed °F change with a true minus: "−0.42 °F", "+0.10 °F", "0.00 °F". */
export function formatDeltaF(d: number, digits = 2): string {
  const v = Math.abs(d) < 0.5 * 10 ** -digits ? 0 : d;
  const s = Math.abs(v).toFixed(digits);
  return `${v < 0 ? "−" : v > 0 ? "+" : ""}${s} °F`;
}
