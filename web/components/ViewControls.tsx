"use client";

import { Segmented, type SegmentOption } from "@/components/ui/segmented";
import { useDashboard } from "@/lib/store";
import type { ViewMode } from "@/lib/types";

const MODES: SegmentOption<ViewMode>[] = [
  { value: "heat", label: "Heat", title: "Heat Score after applied actions" },
  { value: "change", label: "Change", title: "Change in Heat Score from applied actions (estimate)" },
];

/** Top-bar view controls: Heat / Change mode. */
export function ViewControls() {
  const mode = useDashboard((s) => s.viewMode);
  const setMode = useDashboard((s) => s.setViewMode);
  return (
    <div className="flex items-center gap-2">
      <Segmented label="View mode" value={mode} options={MODES} onChange={setMode} />
    </div>
  );
}
