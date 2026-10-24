import { rampCss } from "@/lib/colors";
import { formatTemp, type Range } from "@/lib/heat";

/** Heat ramp legend, overlaid in a map corner. */
export function Legend({ range }: { range: Range }) {
  return (
    <div
      role="group"
      aria-label="Heat legend"
      className="pointer-events-none absolute bottom-9 left-2 w-52 rounded-md border border-border bg-card/90 px-3 py-2 text-xs shadow"
    >
      <p className="mb-1 font-medium text-foreground">Air temp, 3pm, July 2019</p>
      <div aria-hidden className="h-2 rounded-sm" style={{ background: rampCss() }} />
      <div className="mt-1 flex justify-between text-muted-foreground">
        <span>{formatTemp(range.min)}</span>
        <span>{formatTemp(range.max)}</span>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">Source: Heat Watch (CAPA, Museum of Science)</p>
    </div>
  );
}
