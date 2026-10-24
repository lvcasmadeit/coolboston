import { CHANGE_RAMP, rampCss } from "@/lib/colors";
import { formatTemp, type Range } from "@/lib/heat";
import type { Metric, ViewMode } from "@/lib/types";

const TITLES: Record<Metric, { title: string; source: string }> = {
  air: { title: "Air temp, 3pm, July 2019", source: "Source: Heat Watch (CAPA, Museum of Science)" },
  surface: {
    title: "Surface temp, summer 2019, mid-morning",
    source: "Source: Landsat 7/8 median, ~11 a.m. EDT (USGS). 2nd–98th percentile shown.",
  },
};

interface LegendProps {
  metric: Metric;
  mode: ViewMode;
  range: Range;
  /** Largest % heat-island reduction (Change mode). */
  maxPct: number;
}

/** Map legend for the current metric and view mode, overlaid in a map corner. */
export function Legend({ metric, mode, range, maxPct }: LegendProps) {
  const t = TITLES[metric];
  const change = mode === "change";
  return (
    <div
      role="group"
      aria-label="Heat legend"
      className="pointer-events-none absolute bottom-9 left-2 w-56 rounded-md border border-border bg-card/90 px-3 py-2 text-xs shadow"
    >
      <p className="mb-1 font-medium text-foreground">
        {change ? `Heat-island reduction (${metric === "air" ? "air" : "surface"}), estimate` : t.title}
      </p>
      <div aria-hidden className="h-2 rounded-sm" style={{ background: rampCss(change ? CHANGE_RAMP : undefined) }} />
      <div className="mt-1 flex justify-between text-muted-foreground">
        <span>{change ? "0%" : formatTemp(range.min)}</span>
        <span>{change ? (maxPct > 0 ? `${maxPct.toFixed(maxPct < 1 ? 2 : 1)}%` : "no actions") : formatTemp(range.max)}</span>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {change ? "Grey: unaffected, or heat island ≤ 0.5 °F (n/a)." : t.source}
      </p>
    </div>
  );
}
