"use client";

import { CartesianGrid, ErrorBar, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { INTERVENTION_CSS } from "@/components/charts/chartColors";
import { formatDeltaF, formatUsd } from "@/lib/format";
import type { TradeoffPoint } from "@/lib/tradeoff";

type Plotted = TradeoffPoint & { heatIslandPct: number };

function TipContent({ active, payload }: { active?: boolean; payload?: { payload: Plotted }[] }) {
  const p = active ? payload?.[0]?.payload : undefined;
  if (!p) return null;
  return (
    <div className="rounded-md border border-border bg-card px-2 py-1.5 text-xs shadow">
      <p className="font-medium text-foreground">{p.label}</p>
      <p className="text-muted-foreground">Capital: {p.costLabel} (est.)</p>
      <p className="text-muted-foreground">Heat island: −{p.heatIslandPct.toFixed(1)}% (est.)</p>
      {p.roofSurfaceF !== null && (
        <p className="text-muted-foreground">Roof surface: {formatDeltaF(p.roofSurfaceF, 0)}, peak summer</p>
      )}
    </div>
  );
}

/** Scatter of capital cost (x, with low–high range) against % heat-island reduction (y). */
export function TradeoffChart({ points }: { points: TradeoffPoint[] }) {
  const plotted = points.filter((p): p is Plotted => p.heatIslandPct !== null);
  const na = points.length - plotted.length;
  const groups = [...new Set(plotted.map((p) => p.intervention))];
  return (
    <figure aria-label="Cost versus effect" className="flex min-h-0 flex-col">
      <figcaption className="text-xs font-medium text-foreground">Cost vs heat-island reduction (estimates)</figcaption>
      {points.length === 0 ? (
        <p className="m-auto text-xs text-muted-foreground">Apply an action to compare cost and effect.</p>
      ) : (
        <>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="costCentral"
                  name="Capital cost"
                  tickFormatter={(v: number) => formatUsd(v)}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  domain={[0, "auto"]}
                />
                <YAxis
                  type="number"
                  dataKey="heatIslandPct"
                  name="Heat-island reduction"
                  unit="%"
                  width={40}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  domain={[0, "auto"]}
                />
                <Tooltip content={<TipContent />} cursor={{ strokeDasharray: "3 3" }} />
                {groups.map((g) => (
                  <Scatter key={g} data={plotted.filter((p) => p.intervention === g)} fill={INTERVENTION_CSS[g]} isAnimationActive={false}>
                    <ErrorBar dataKey="costError" direction="x" width={4} stroke={INTERVENTION_CSS[g]} isAnimationActive={false} />
                  </Scatter>
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Bars: capital cost low–high. Each point is one action on its own tile(es).
            {na > 0 && ` ${na} action${na === 1 ? "" : "s"} not shown: heat island ≤ 0.5 °F (n/a).`}
          </p>
        </>
      )}
    </figure>
  );
}
