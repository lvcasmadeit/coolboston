export interface Range {
  min: number;
  max: number;
}

/** Min/max of the non-null values, or null if there are none. */
export function valueRange(values: Iterable<number | null>): Range | null {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v === null) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return min <= max ? { min, max } : null;
}

/**
 * [lo, hi] quantile range of the non-null values (nearest rank), or null if there are none.
 * Used for surface temperature, whose waterfront and rooftop extremes would wash out a min/max ramp.
 */
export function quantileRange(values: Iterable<number | null>, lo = 0.02, hi = 0.98): Range | null {
  const v = [...values].filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (!v.length) return null;
  const at = (q: number) => v[Math.min(v.length - 1, Math.max(0, Math.round(q * (v.length - 1))))];
  return { min: at(lo), max: at(hi) };
}

export function formatTemp(t: number | null): string {
  return t === null ? "No data" : `${t.toFixed(1)} °F`;
}
