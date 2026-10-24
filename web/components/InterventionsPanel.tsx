"use client";

import { ActionList } from "@/components/ActionList";
import { useHeatModel } from "@/components/useHeatModel";
import { availableActions, type Offer } from "@/lib/availableActions";
import { computeDeltas, type LandAreas } from "@/lib/cooling";
import { formatDeltaF, formatEstimate, formatUsdRange } from "@/lib/format";
import { capitalCost } from "@/lib/impact";
import { CATALOG, TREE_CANOPY_GAIN, type InterventionSpec } from "@/lib/interventions";
import { useDashboard } from "@/lib/store";
import {
  AREA_INTERVENTIONS,
  BUILDING_INTERVENTIONS,
  type Action,
  type ActionTarget,
  type Intervention,
  type NewAction,
  type Selection,
} from "@/lib/types";

/** Illustration per intervention (web/public/interventions). */
export const interventionImage = (id: Intervention) => `/interventions/${id}.svg`;

/** One-line description under each intervention's name. Keep "area" out: e2e finds the Area tool by name. */
const BLURB: Record<Intervention, string> = {
  solar: "Panels on the roof generate clean energy.",
  "green-roof": "Vegetation on the roof cools its surface.",
  "cool-building": "A high-albedo roof reflects sunlight.",
  "green-walls": "Plants on the lower facade.",
  "green-roof-solar": "A green roof with solar panels above.",
  "street-trees": "Canopy shades streets and sidewalks.",
};

const ALL: InterventionSpec[] = [...BUILDING_INTERVENTIONS, ...AREA_INTERVENTIONS].map((id) => CATALOG[id]);

const targetOf = (s: NonNullable<Selection>): ActionTarget =>
  s.kind === "building" ? { kind: "building", building: s.building } : { kind: "area", cells: s.cells };

const draft = (spec: InterventionSpec, target: ActionTarget) => ({ id: "preview", intervention: spec.id, target }) as Action;

/** Air ΔT the action alone would cause at its target tile, °F; 0 for actions with no cooling claim. */
function previewAirF(a: Action, byId: LandAreas | null): number {
  const d = byId ? computeDeltas([a], byId) : computeDeltas([a]);
  const at = a.target.kind === "building" ? a.target.building.primaryTile : a.target.cells[0];
  return d.get(at)?.air ?? 0;
}

/** Offer for every intervention: the selection's offers, or disabled for no or the other kind of selection. */
function offersFor(selection: Selection, offers: Offer[]): Offer[] {
  return ALL.map((spec) => {
    const o = offers.find((x) => x.spec.id === spec.id);
    if (o) return o;
    if (!selection) return { spec, enabled: false, reason: null };
    return { spec, enabled: false, reason: spec.appliesTo === "building" ? "For buildings: select one." : "For tiles: use the Area tool." };
  });
}

function InterventionButton({
  offer,
  target,
  byId,
  onApply,
}: {
  offer: Offer;
  target: ActionTarget | null;
  byId: LandAreas | null;
  onApply: (a: NewAction) => void;
}) {
  const { spec } = offer;
  const live = target && offer.enabled ? draft(spec, target) : null;
  const air = live ? previewAirF(live, byId) : 0;
  const effect =
    spec.id === "street-trees" ? `+${TREE_CANOPY_GAIN.toFixed(2)} canopy: ${formatDeltaF(air)} air per tile` : air === 0 ? "No cooling claimed" : `${formatDeltaF(air)} air per tile`;
  const reasonId = `reason-${spec.id}`;
  return (
    <li>
      <button
        type="button"
        disabled={!offer.enabled}
        aria-describedby={offer.reason ? reasonId : undefined}
        onClick={() => target && onApply({ intervention: spec.id, target } as NewAction)}
        className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-2 text-left outline-none transition-colors hover:border-emerald-500 hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-card dark:hover:bg-emerald-950"
      >
        <span className="block min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{spec.label}</span>
          <span className="block text-[11px] leading-snug text-muted-foreground">{BLURB[spec.id]}</span>
          {live && (
            <span className="mt-0.5 block text-[11px] text-emerald-700 dark:text-emerald-400">
              {formatEstimate(capitalCost(live), formatUsdRange)} (est.) · {effect}
            </span>
          )}
        </span>
        {/* Decorative: the name is the label. Order puts the name first in the accessible name. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVGs, no optimisation needed */}
        <img src={interventionImage(spec.id)} alt="" width={44} height={44} className="order-first size-11 shrink-0 rounded-md" />
      </button>
      {offer.reason && (
        <p id={reasonId} className="mt-0.5 px-1 text-[11px] text-muted-foreground">
          {offer.reason}
        </p>
      )}
    </li>
  );
}

/** Left pane: the interventions to apply and what has been applied. */
export function InterventionsPanel() {
  const selection = useDashboard((s) => s.selection);
  const actions = useDashboard((s) => s.actions);
  const addAction = useDashboard((s) => s.addAction);
  const data = useHeatModel();
  const byId = data.status === "ready" ? data.model.byId : null;

  const outsideGrid = selection?.kind === "building" && !!byId && !selection.building.tiles.some((t) => byId.has(t.id));
  const offers = offersFor(selection, availableActions(selection, actions, { outsideGrid }));
  const target = selection ? targetOf(selection) : null;

  return (
    <aside aria-label="Interventions" className="flex min-h-0 flex-col gap-4 overflow-y-auto border-r border-border bg-background p-3">
      <section aria-label="Cooling actions" className="space-y-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Interventions</h2>
          <p className="text-xs text-muted-foreground">
            {selection
              ? selection.kind === "building"
                ? "Apply to the selected building."
                : `Apply to the ${selection.cells.length} selected tile${selection.cells.length === 1 ? "" : "s"}.`
              : "Select a building, or tiles with the Area tool, to apply one."}
          </p>
        </div>
        <ul className="space-y-1.5">
          {offers.map((o) => (
            <InterventionButton key={o.spec.id} offer={o} target={target} byId={byId} onApply={addAction} />
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground">
          Costs are capital estimates (low–high). Air effects are tile averages; nearby tiles cool too, by less.
        </p>
        <p className="text-[11px] text-muted-foreground">Area tool: shift-click adds or removes a tile; shift-drag selects a box. Escape clears.</p>
      </section>

      <ActionList />
    </aside>
  );
}
