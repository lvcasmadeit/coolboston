"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { LAYERS, layerSetting } from "@/lib/layers";
import { useDashboard } from "@/lib/store";

/** Layers tab: visibility toggles and opacity sliders, all from the store. */
export function LayersPanel() {
  const layers = useDashboard((s) => s.layers);
  const toggle = useDashboard((s) => s.toggleLayer);
  const setOpacity = useDashboard((s) => s.setLayerOpacity);
  return (
    <ul className="space-y-3">
      {LAYERS.map((l) => {
        const st = layerSetting(layers, l.id);
        const cb = `layer-${l.id}`;
        return (
          <li key={l.id} className="space-y-1.5 rounded-md border border-border bg-background p-2">
            <div className="flex items-start gap-2">
              <Checkbox id={cb} checked={st.visible} onCheckedChange={() => toggle(l.id)} className="mt-0.5" />
              <label htmlFor={cb} className="text-sm text-foreground">
                {l.label}
                <span className="block text-[11px] text-muted-foreground">{l.description}</span>
              </label>
            </div>
            {l.hasOpacity && (
              <div className="flex items-center gap-2 pl-6">
                <Slider
                  aria-label={`${l.label} opacity`}
                  min={0}
                  max={100}
                  step={5}
                  value={[Math.round(st.opacity * 100)]}
                  onValueChange={([v]) => setOpacity(l.id, v / 100)}
                  disabled={!st.visible}
                />
                <span className="w-9 text-right text-[11px] text-muted-foreground tabular-nums">{Math.round(st.opacity * 100)}%</span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
