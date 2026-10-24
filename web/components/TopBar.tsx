"use client";

import { Thermometer } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboard } from "@/lib/store";
import { INTERVENTION_LABELS, INTERVENTIONS, type Intervention } from "@/lib/types";

export function TopBar() {
  const intervention = useDashboard((s) => s.intervention);
  const setIntervention = useDashboard((s) => s.setIntervention);

  return (
    <header className="flex h-12 items-center gap-4 border-b border-border bg-card px-4">
      <div className="flex items-center gap-2">
        <Thermometer className="size-5 text-orange-500" aria-hidden />
        <span className="font-semibold tracking-tight">CoolBoston</span>
        <span className="hidden text-sm text-muted-foreground md:inline">
          | Urban Heat Island Explorer
        </span>
      </div>
      <span className="text-sm text-muted-foreground">Boston, MA</span>

      <div className="ml-auto flex items-center gap-2">
        <label htmlFor="intervention-select" className="text-sm text-muted-foreground">
          Intervention
        </label>
        <Select value={intervention} onValueChange={(v) => setIntervention(v as Intervention)}>
          <SelectTrigger id="intervention-select" className="w-44" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INTERVENTIONS.map((id) => (
              <SelectItem key={id} value={id}>
                {INTERVENTION_LABELS[id]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </header>
  );
}
