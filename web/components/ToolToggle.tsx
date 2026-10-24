"use client";

import { Building2, Hexagon } from "lucide-react";
import { useDashboard } from "@/lib/store";
import type { SelectTool } from "@/lib/types";

const TOOLS: { id: SelectTool; label: string; hint: string; Icon: typeof Building2 }[] = [
  { id: "building", label: "Building", hint: "Click a building to select it", Icon: Building2 },
  { id: "area", label: "Area", hint: "Click a hex; shift-click to add or remove; shift-drag to box-select", Icon: Hexagon },
];

/** Building / Area selection tool, floating over the map. */
export function ToolToggle() {
  const tool = useDashboard((s) => s.tool);
  const setTool = useDashboard((s) => s.setTool);
  return (
    <div
      role="group"
      aria-label="Selection tool"
      className="absolute top-2 left-1/2 flex -translate-x-1/2 gap-1 rounded-md border border-border bg-card p-1 text-xs shadow-sm"
    >
      {TOOLS.map(({ id, label, hint, Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={tool === id}
          title={hint}
          onClick={() => setTool(id)}
          className={`flex items-center gap-1 rounded px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            tool === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
