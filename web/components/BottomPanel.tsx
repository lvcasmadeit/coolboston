"use client";

import { BeforeAfterChart } from "@/components/charts/BeforeAfterChart";
import { TradeoffChart } from "@/components/charts/TradeoffChart";
import { useHeatModel } from "@/components/useHeatModel";
import { beforeAfterRows } from "@/lib/beforeAfter";
import { selectionMetrics } from "@/lib/metrics";
import { useDashboard } from "@/lib/store";
import { chartActions, tradeoffPoints } from "@/lib/tradeoff";

/** Impact charts for the current selection's actions (every action when nothing is selected). */
export function BottomPanel() {
  const selection = useDashboard((s) => s.selection);
  const actions = useDashboard((s) => s.actions);
  const data = useHeatModel();
  const mine = chartActions(selection, actions);
  const ready = data.status === "ready" ? data.model : null;
  const points = ready ? tradeoffPoints(mine, ready.byId, ready.baseline) : [];
  const rows = ready && selection ? beforeAfterRows(selectionMetrics(selection, actions, ready.byId, ready.baseline)) : [];
  return (
    <section aria-label="Impact" className="grid min-h-0 grid-rows-[auto_1fr] gap-2 border-t border-border bg-card p-3">
      <h2 className="text-sm font-medium">
        Impact <span className="font-normal text-muted-foreground">· {selection ? "selection" : "all actions"}</span>
      </h2>
      <div className="grid min-h-0 grid-cols-2 gap-3">
        <TradeoffChart points={points} />
        <BeforeAfterChart rows={rows} emptyText={selection ? "Apply an action to this selection to compare." : "Select a building or area to compare."} />
      </div>
    </section>
  );
}
