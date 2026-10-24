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

export function formatTemp(t: number | null): string {
  return t === null ? "No data" : `${t.toFixed(1)} °F`;
}
