"use client";

import { ChevronDown, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { actionRows, type ActionRow } from "@/lib/actionList";
import { formatUsdRange } from "@/lib/format";
import { totals } from "@/lib/impact";
import { useDashboard } from "@/lib/store";

const GROUPS = [
  { kind: "building", label: "Buildings" },
  { kind: "area", label: "Areas" },
] as const;

function Row({ r }: { r: ActionRow }) {
  const removeAction = useDashboard((s) => s.removeAction);
  const focusOn = useDashboard((s) => s.focusOn);
  return (
    <li className="flex items-stretch gap-1">
      <button
        type="button"
        onClick={() => focusOn(r.center)}
        title="Show on map"
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-card px-2 py-1 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="block min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-foreground">{r.label}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {r.target} · {r.cost}
          </span>
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
        <img src={`/interventions/${r.intervention}.svg`} alt="" width={28} height={28} className="order-first size-7 shrink-0 rounded" />
      </button>
      <Button size="icon-sm" variant="ghost" aria-label={`Remove ${r.label}, ${r.target}`} onClick={() => removeAction(r.id)}>
        <X aria-hidden />
      </Button>
    </li>
  );
}

/** Applied actions, newest first, in Buildings and Areas drop-downs: click to fly there, remove one, undo the latest, or reset all. */
export function ActionList() {
  const actions = useDashboard((s) => s.actions);
  const undo = useDashboard((s) => s.undo);
  const reset = useDashboard((s) => s.resetActions);
  const rows = actionRows(actions);
  const t = totals(actions);

  return (
    <section aria-label="Applied actions" className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Applied ({rows.length})</h3>
        <div className="flex gap-1">
          <Button size="xs" variant="outline" onClick={undo} disabled={!rows.length}>
            <Undo2 aria-hidden /> Undo
          </Button>
          <Button size="xs" variant="outline" onClick={reset} disabled={!rows.length}>
            Reset
          </Button>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No actions yet.</p>
      ) : (
        <>
          {GROUPS.map((g) => {
            const mine = rows.filter((r) => r.kind === g.kind);
            return (
              <details key={g.kind} open className="group rounded-md border border-border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  <span>
                    {g.label} <span className="text-muted-foreground">({mine.length})</span>
                  </span>
                  <ChevronDown aria-hidden className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                {mine.length === 0 ? (
                  <p className="px-2 pb-2 text-[11px] text-muted-foreground">None yet.</p>
                ) : (
                  <ul className="space-y-1 px-1.5 pb-1.5">
                    {mine.map((r) => (
                      <Row key={r.id} r={r} />
                    ))}
                  </ul>
                )}
              </details>
            );
          })}
          <p className="text-[11px] text-muted-foreground">
            Total capital (est.): {formatUsdRange(t.capital)}
            {t.capitalNotQuantified > 0 && ` + ${t.capitalNotQuantified} not quantified`}
          </p>
        </>
      )}
    </section>
  );
}
