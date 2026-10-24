"use client";

import { formatDeltaF, formatNumRange, formatUsdRange } from "@/lib/format";
import { formatTemp } from "@/lib/heat";
import type { SelectionMetrics } from "@/lib/metrics";

function Card({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-2 py-1.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
      {note && <p className="text-[10px] leading-tight text-muted-foreground">{note}</p>}
    </div>
  );
}

const signedF = (v: number | null) => (v === null ? "No data" : `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)} °F`);

/** Current conditions and, once actions apply, their estimated change. Every number is an estimate. */
export function MetricCards({ m }: { m: SelectionMetrics }) {
  const lvl = m.level === "building tile" ? "tile level" : "mean of selected tiles";
  const c = m.change;
  const zero = (r: { high: number }) => r.high === 0;
  return (
    <div className="space-y-3">
      <section aria-label="Current conditions" className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">Current conditions</h3>
        <div className="grid grid-cols-2 gap-1.5">
          <Card label="Air, 3pm" value={formatTemp(m.before.air)} note={`July 2019, ${lvl}`} />
          <Card label="Surface" value={formatTemp(m.before.surface)} note={`Summer 2019, mid-morning, ${lvl}`} />
          <Card label="Heat island" value={signedF(m.before.heatIslandF)} note="Air vs citywide mean" />
        </div>
      </section>
      {c && (
        <section aria-label="Estimated change" aria-live="polite" className="space-y-1">
          <h3 className="text-sm font-medium text-foreground">Estimated change</h3>
          <div className="grid grid-cols-2 gap-1.5">
            <Card label="Air" value={c.airDeltaF === null ? "No data" : formatDeltaF(c.airDeltaF)} note={`Estimate, ${lvl}`} />
            <Card
              label="Surface"
              value={c.surfaceDeltaF === null ? "No data" : formatDeltaF(c.surfaceDeltaF, 1)}
              note={`Estimate, mid-morning, ${lvl}`}
            />
            <Card
              label="Heat island"
              value={c.heatIslandPct === null ? "n/a" : `−${c.heatIslandPct.toFixed(1)}%`}
              note={c.heatIslandPct === null ? "Heat island ≤ 0.5 °F" : "Estimate, air"}
            />
            {c.roofSurfaceF !== null && (
              <Card label="Roof surface" value={formatDeltaF(c.roofSurfaceF, 0)} note="Peak summer, up to (EPA)" />
            )}
            <Card
              label="Energy"
              value={zero(c.totals.kwh) ? (c.energyNotQuantified ? "not quantified" : "—") : formatNumRange(c.totals.kwh, "kWh/yr")}
              note={
                zero(c.totals.usd)
                  ? "Estimate"
                  : `${formatUsdRange(c.totals.usd)}/yr (est.)${c.energyNotQuantified ? "; part not quantified" : ""}`
              }
            />
            <Card
              label="Capital cost"
              value={formatUsdRange(c.totals.capital)}
              note={c.totals.capitalNotQuantified ? `Estimate; ${c.totals.capitalNotQuantified} not quantified` : "Estimate, low–high"}
            />
          </div>
        </section>
      )}
    </div>
  );
}
