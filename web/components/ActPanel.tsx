"use client";

import { useMemo } from "react";
import { ActionList } from "@/components/ActionList";
import { MetricCards } from "@/components/MetricCards";
import { useHexes } from "@/components/useHexes";
import { availableActions, type Offer } from "@/lib/availableActions";
import { computeDeltas } from "@/lib/cooling";
import { formatAcres, formatArea, formatDeltaF, formatEstimate, formatUsdRange } from "@/lib/format";
import { HEX_AREA_M2 } from "@/lib/geo";
import { formatTemp } from "@/lib/heat";
import { capitalCost, computeBaseline } from "@/lib/impact";
import { selectionMetrics } from "@/lib/metrics";
import { useDashboard } from "@/lib/store";
import type { Action, ActionTarget, Hex, NewAction, Selection } from "@/lib/types";

const targetOf = (s: NonNullable<Selection>): ActionTarget =>
  s.kind === "building" ? { kind: "building", building: s.building } : { kind: "area", cells: s.cells };

const draft = (offer: Offer, target: ActionTarget) => ({ id: "preview", intervention: offer.spec.id, target }) as Action;

/** Air ΔT the action would cause in its (first) hex, °F; 0 for actions with no cooling claim. */
function previewAirF(a: Action): number {
  const d = computeDeltas([a]);
  const first = d.values().next();
  return first.done ? 0 : first.value.air;
}

function Details({ selection, byId }: { selection: NonNullable<Selection>; byId: ReadonlyMap<string, Hex> | null }) {
  if (selection.kind === "building") {
    const b = selection.building;
    return (
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Roof area</dt>
        <dd>{formatArea(b.roofAreaM2)}</dd>
        <dt className="text-muted-foreground">Height</dt>
        <dd>{b.heightM === null ? "unknown" : `${b.heightM.toFixed(0)} m`}</dd>
        <dt className="text-muted-foreground">Hex air, 3pm</dt>
        <dd>{byId ? formatTemp(byId.get(b.cell)?.temp3pm ?? null) : "…"}</dd>
      </dl>
    );
  }
  const n = selection.cells.length;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      <dt className="text-muted-foreground">Hexes</dt>
      <dd>{n}</dd>
      <dt className="text-muted-foreground">Area</dt>
      <dd>{formatAcres(n * HEX_AREA_M2)}</dd>
    </dl>
  );
}

function ActionButton({ offer, target, onApply }: { offer: Offer; target: ActionTarget; onApply: (a: NewAction) => void }) {
  const a = draft(offer, target);
  const air = previewAirF(a);
  const cost = formatEstimate(capitalCost(a), formatUsdRange);
  const effect =
    offer.spec.id === "street-trees"
      ? `+0.10 canopy: ${formatDeltaF(air)} air per hex`
      : air === 0
        ? "No cooling claimed"
        : `${formatDeltaF(air)} air at hex`;
  const reasonId = `reason-${offer.spec.id}`;
  return (
    <li>
      <button
        type="button"
        disabled={!offer.enabled}
        aria-describedby={offer.reason ? reasonId : undefined}
        onClick={() => onApply({ intervention: offer.spec.id, target } as NewAction)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-left outline-none hover:border-primary hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-background"
      >
        <span className="block text-sm font-medium text-foreground">{offer.spec.label}</span>
        <span className="block text-xs text-muted-foreground">
          {cost} (est.) · {effect}
        </span>
      </button>
      {offer.reason && (
        <p id={reasonId} className="mt-0.5 px-1 text-[11px] text-muted-foreground">
          {offer.reason}
        </p>
      )}
    </li>
  );
}

/** Act tab: selection details and the actions available for it. */
export function ActPanel() {
  const selection = useDashboard((s) => s.selection);
  const actions = useDashboard((s) => s.actions);
  const addAction = useDashboard((s) => s.addAction);
  const data = useHexes();
  const byId = useMemo(
    () => (data.status === "ready" ? new Map(data.hexes.map((h) => [h.id, h])) : null),
    [data],
  );
  const baseline = useMemo(() => (data.status === "ready" ? computeBaseline(data.hexes) : null), [data]);

  if (!selection) {
    return (
      <div className="space-y-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Click a building to select it, or switch to the Area tool and click hexes.</p>
          <p className="text-xs">Area tool: shift-click adds or removes a hex; shift-drag selects a box. Escape clears.</p>
        </div>
        <ActionList />
      </div>
    );
  }

  const target = targetOf(selection);
  const offers = availableActions(selection, actions);
  return (
    <div className="space-y-3">
      <section aria-label="Selection" className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">
          {selection.kind === "building" ? "Selected building" : "Selected area"}
        </h3>
        <Details selection={selection} byId={byId} />
      </section>
      {byId && baseline && <MetricCards m={selectionMetrics(selection, actions, byId, baseline)} />}
      <section aria-label="Cooling actions" className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">Actions</h3>
        <ul className="space-y-1.5">
          {offers.map((o) => (
            <ActionButton key={o.spec.id} offer={o} target={target} onApply={addAction} />
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground">Costs are capital estimates (low–high). Air effects are hex averages.</p>
      </section>
      <ActionList />
    </div>
  );
}
