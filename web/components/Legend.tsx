import { CHANGE_RAMP, rampCss } from "@/lib/colors";
import { scoreRampCss } from "@/lib/heatScore";
import { SCORE_CATEGORIES, SCORE_INPUT_LABELS } from "@/lib/heatScoreConfig";
import type { ViewMode } from "@/lib/types";

interface LegendProps {
  mode: ViewMode;
  /** Largest Heat Score reduction in points (Change mode). */
  maxDrop: number;
}

/** Map legend for the Heat Score or its change, overlaid in a map corner. */
export function Legend({ mode, maxDrop }: LegendProps) {
  const change = mode === "change";
  return (
    <div
      role="group"
      aria-label="Heat legend"
      className="pointer-events-none absolute bottom-9 left-2 w-60 rounded-md border border-border bg-card/90 px-3 py-2 text-xs shadow"
    >
      <p className="mb-1 font-medium text-foreground">{change ? "Change in Heat Score (points), estimate" : "Heat Score (0–100)"}</p>
      <div aria-hidden className="h-2 rounded-sm" style={{ background: change ? rampCss(CHANGE_RAMP) : scoreRampCss() }} />
      {change ? (
        <div className="mt-1 flex justify-between text-muted-foreground">
          <span>0</span>
          <span>{maxDrop > 0 ? `−${maxDrop.toFixed(maxDrop < 1 ? 2 : 1)}` : "no actions"}</span>
        </div>
      ) : (
        <ul aria-label="Categories" className="relative mt-1 h-3.5 text-[10px] text-muted-foreground">
          {SCORE_CATEGORIES.map((c) => (
            <li key={c.label} className="absolute top-0 border-l border-muted-foreground/50 pl-0.5 leading-none" style={{ left: `${c.min}%` }}>
              {c.label}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-[10px] text-muted-foreground">
        {change ? "Grey: unaffected, or no data." : "CoolBoston index, relative to Boston, summer 2019."}
      </p>
      {!change && (
        <p className="text-[10px] text-muted-foreground">
          {SCORE_INPUT_LABELS.air} · {SCORE_INPUT_LABELS.surface} (not simultaneous).
        </p>
      )}
    </div>
  );
}
