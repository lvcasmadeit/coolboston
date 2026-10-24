"use client";

import { useMemo } from "react";
import { BeforeAfterChart } from "@/components/charts/BeforeAfterChart";
import { TradeoffChart } from "@/components/charts/TradeoffChart";
import { MetricCards } from "@/components/MetricCards";
import { useHeatModel } from "@/components/useHeatModel";
import { beforeAfterRows } from "@/lib/beforeAfter";
import { computeDeltas } from "@/lib/cooling";
import { formatAcres, formatArea } from "@/lib/format";
import { TILE_AREA_M2 } from "@/lib/grid";
import { rgbaCss } from "@/lib/heatFill";
import { category, displayScore, scoreColor, scoreRampCss } from "@/lib/heatScore";
import { formatPoints } from "@/lib/heatView";
import { selectionMetrics } from "@/lib/metrics";
import { selectionScore } from "@/lib/selectionScore";
import { useDashboard } from "@/lib/store";
import { chartActions, tradeoffPoints } from "@/lib/tradeoff";
import type { Selection } from "@/lib/types";

const card = "rounded-lg border border-border bg-background p-3";

/** Heat Score of the selection (tile or mean of tiles), and the estimated score after its actions. */
function HeatScoreCard({ selection }: { selection: Selection }) {
  const actions = useDashboard((s) => s.actions);
  const data = useHeatModel();
  const model = data.status === "ready" ? data.model : null;
  const deltas = useMemo(() => (model ? computeDeltas(actions, model.byId) : new Map()), [actions, model]);
  const s = model && selection ? selectionScore(selection, model.byId, deltas, model.scores) : null;
  const lvl = selection?.kind === "area" ? "Mean of selected tiles" : "Building tile";
  const changed = s !== null && Math.abs(s.change) >= 0.05;
  return (
    <section aria-label="Heat Score" className={card}>
      <h3 className="text-sm font-medium text-foreground">Heat Score</h3>
      {!selection ? (
        <p className="mt-1 text-xs text-muted-foreground">Select a building or tiles to see its score.</p>
      ) : !s ? (
        <p className="mt-1 text-xs text-muted-foreground">No data for this selection.</p>
      ) : (
        <>
          <div className="mt-1 flex items-end justify-between gap-2">
            <p>
              <span className="text-3xl font-semibold tabular-nums" style={{ color: rgbaCss(scoreColor(s.before)) }}>
                {displayScore(s.before)}
              </span>
              <span className="text-sm text-muted-foreground"> / 100</span>
              <span className="block text-xs font-medium text-foreground">{category(s.before)} relative heat</span>
            </p>
            {changed && (
              <p className="text-right" aria-live="polite">
                <span className="block text-[11px] text-muted-foreground">After (est.)</span>
                <span className="text-xl font-semibold tabular-nums">{displayScore(s.after)}</span>
                <span className="ml-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">{formatPoints(s.change)} pts</span>
              </p>
            )}
          </div>
          <div aria-hidden className="relative mt-2 h-2 rounded-full" style={{ background: scoreRampCss() }}>
            <span
              className="absolute -top-1 size-4 -translate-x-1/2 rounded-full border-2 border-white shadow"
              style={{ left: `${s.after}%`, background: rgbaCss(scoreColor(s.after)) }}
            />
          </div>
          <div aria-hidden className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>0 Cooler</span>
            <span>100 Hotter</span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">{lvl}. CoolBoston index, relative to Boston, summer 2019; not an official heat-stress index.</p>
        </>
      )}
    </section>
  );
}

function Details({ selection }: { selection: NonNullable<Selection> }) {
  if (selection.kind === "building") {
    const b = selection.building;
    return (
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Roof area</dt>
        <dd className="text-right">{formatArea(b.roofAreaM2)}</dd>
        <dt className="text-muted-foreground">Height</dt>
        <dd className="text-right">{b.heightM === null ? "unknown" : `${b.heightM.toFixed(0)} m`}</dd>
      </dl>
    );
  }
  const n = selection.cells.length;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      <dt className="text-muted-foreground">Tiles</dt>
      <dd className="text-right">{n}</dd>
      <dt className="text-muted-foreground">Land</dt>
      <dd className="text-right">{formatAcres(n * TILE_AREA_M2)}</dd>
    </dl>
  );
}

/** Impact charts for the current selection's actions (every action when nothing is selected). */
function ImpactCharts({ selection }: { selection: Selection }) {
  const actions = useDashboard((s) => s.actions);
  const data = useHeatModel();
  const ready = data.status === "ready" ? data.model : null;
  const points = ready ? tradeoffPoints(chartActions(selection, actions), ready.byId, ready.baseline) : [];
  const rows = ready && selection ? beforeAfterRows(selectionMetrics(selection, actions, ready.byId, ready.baseline)) : [];
  return (
    <section aria-label="Impact" className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">
        Impact <span className="font-normal text-muted-foreground">· {selection ? "selection" : "all actions"}</span>
      </h3>
      <div className={`${card} grid h-52`}>
        <TradeoffChart points={points} />
      </div>
      <div className={`${card} grid h-52`}>
        <BeforeAfterChart rows={rows} emptyText={selection ? "Apply an action to this selection to compare." : "Select a building or area to compare."} />
      </div>
    </section>
  );
}

/** Right pane, Metrics tab: score, selection details, metric cards and impact charts. */
export function MetricsPanel() {
  const selection = useDashboard((s) => s.selection);
  const actions = useDashboard((s) => s.actions);
  const data = useHeatModel();
  const model = data.status === "ready" ? data.model : null;
  return (
    <div className="space-y-3">
      <HeatScoreCard selection={selection} />
      {selection && (
        <section aria-label="Selection" className={`${card} space-y-2`}>
          <h3 className="text-sm font-medium text-foreground">{selection.kind === "building" ? "Selected building" : "Selected area"}</h3>
          <Details selection={selection} />
          {model && <MetricCards m={selectionMetrics(selection, actions, model.byId, model.baseline)} />}
        </section>
      )}
      <ImpactCharts selection={selection} />
    </div>
  );
}
