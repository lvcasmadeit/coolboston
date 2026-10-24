/** Before/after rows for the selection (Task 33). Pure. Empty unless an action applies to it. */
import type { SelectionMetrics } from "@/lib/metrics";

export interface BeforeAfterRow {
  key: "air" | "surface" | "heatIsland";
  label: string;
  note: string;
  /** °F */
  before: number;
  after: number;
}

export function beforeAfterRows(m: SelectionMetrics | null): BeforeAfterRow[] {
  if (!m?.change) return [];
  const rows: (Omit<BeforeAfterRow, "before" | "after"> & { before: number | null; after: number | null })[] = [
    { key: "air", label: "Air, 3pm", note: "July 2019", before: m.before.air, after: m.after.air },
    { key: "surface", label: "Surface", note: "mid-morning", before: m.before.surface, after: m.after.surface },
    { key: "heatIsland", label: "Heat island", note: "vs city mean", before: m.before.heatIslandF, after: m.after.heatIslandF },
  ];
  return rows.filter((r): r is BeforeAfterRow => r.before !== null && r.after !== null);
}
