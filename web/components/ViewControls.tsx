"use client";

import { Segmented, type SegmentOption } from "@/components/ui/segmented";
import { useDashboard } from "@/lib/store";
import type { Metric, ViewMode } from "@/lib/types";

const METRICS: SegmentOption<Metric>[] = [
  { value: "air", label: "Air", title: "Heat Watch air temperature, 3pm, July 2019" },
  { value: "surface", label: "Surface", title: "Landsat surface temperature, summer 2019, mid-morning" },
];
const MODES: SegmentOption<ViewMode>[] = [
  { value: "heat", label: "Heat", title: "Temperature after applied actions" },
  { value: "change", label: "Change", title: "% heat-island reduction from applied actions" },
];

/** Top-bar view controls: base metric and Heat / Change mode. */
export function ViewControls() {
  const metric = useDashboard((s) => s.metric);
  const mode = useDashboard((s) => s.viewMode);
  const setMetric = useDashboard((s) => s.setMetric);
  const setMode = useDashboard((s) => s.setViewMode);
  return (
    <div className="flex items-center gap-2">
      <Segmented label="Temperature" value={metric} options={METRICS} onChange={setMetric} />
      <Segmented label="View mode" value={mode} options={MODES} onChange={setMode} />
    </div>
  );
}
