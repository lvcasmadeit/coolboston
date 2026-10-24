"use client";

import { Building2, Grid2x2 } from "lucide-react";
import { Segmented, type SegmentOption } from "@/components/ui/segmented";
import { useDashboard } from "@/lib/store";
import type { SelectTool } from "@/lib/types";

const TOOLS: SegmentOption<SelectTool>[] = [
  { value: "building", label: "Building", title: "Click a building to select it", Icon: Building2 },
  { value: "area", label: "Area", title: "Click a tile; shift-click to add or remove; shift-drag to box-select", Icon: Grid2x2 },
];

/** Building / Area selection tool, floating over the map. */
export function ToolToggle() {
  const tool = useDashboard((s) => s.tool);
  const setTool = useDashboard((s) => s.setTool);
  return (
    <Segmented
      label="Selection tool"
      value={tool}
      options={TOOLS}
      onChange={setTool}
      className="absolute top-2 left-1/2 -translate-x-1/2 shadow-sm"
    />
  );
}
