"use client";

import { Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { actionRows } from "@/lib/actionList";
import { formatUsdRange } from "@/lib/format";
import { totals } from "@/lib/impact";
import { useDashboard } from "@/lib/store";

/** Applied actions, newest first: click to fly there, remove one, undo the latest, or reset all. */
export function ActionList() {
  const actions = useDashboard((s) => s.actions);
  const removeAction = useDashboard((s) => s.removeAction);
  const undo = useDashboard((s) => s.undo);
  const reset = useDashboard((s) => s.resetActions);
  const focusOn = useDashboard((s) => s.focusOn);
  const rows = actionRows(actions);
  const t = totals(actions);

  return (
    <section aria-label="Applied actions" className="space-y-1">
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
          <ul className="space-y-1">
            {rows.map((r) => (
              <li key={r.id} className="flex items-stretch gap-1">
                <button
                  type="button"
                  onClick={() => focusOn(r.center)}
                  title="Show on map"
                  className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="block truncate text-xs font-medium text-foreground">{r.label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {r.target} · {r.cost}
                  </span>
                </button>
                <Button size="icon-sm" variant="ghost" aria-label={`Remove ${r.label}, ${r.target}`} onClick={() => removeAction(r.id)}>
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground">
            Total capital (est.): {formatUsdRange(t.capital)}
            {t.capitalNotQuantified > 0 && ` + ${t.capitalNotQuantified} not quantified`}
          </p>
        </>
      )}
    </section>
  );
}
