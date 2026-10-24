"use client";

import { useEffect, useMemo, useRef } from "react";
import { Layer, Source, useMap } from "react-map-gl/mapbox";
import { HEAT_FILL_ID, changedIndices, tileFeatures, tileFillColors } from "@/lib/heatFill";
import type { HeatView } from "@/lib/heatView";
import type { Cell } from "@/lib/types";

interface HeatFillProps {
  cells: Cell[];
  view: Omit<HeatView, "opacity">;
  maxPct: number;
  visible: boolean;
  opacity: number;
}

/**
 * The heat tiles as a flat Mapbox `fill` layer in Standard's "middle" slot: above roads and
 * ground, under the 3D buildings. The source is created once; views and actions only update
 * feature state for the tiles whose colour changed, and opacity is one paint property.
 */
export function HeatFill({ cells, view, maxPct, visible, opacity }: HeatFillProps) {
  const { current: mapRef } = useMap();
  const data = useMemo(() => tileFeatures(cells), [cells]);
  const colors = useMemo(() => tileFillColors(cells, view, maxPct), [cells, view, maxPct]);
  const applied = useRef<string[] | null>(null);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const apply = () => {
      if (!map.getSource(HEAT_FILL_ID)) return false;
      for (const i of changedIndices(applied.current, colors)) map.setFeatureState({ source: HEAT_FILL_ID, id: i }, { color: colors[i] });
      applied.current = colors;
      return true;
    };
    if (apply()) return;
    // The <Source> is added once the style has loaded; colour it as soon as it exists.
    const retry = () => {
      if (apply()) map.off("styledata", retry);
    };
    map.on("styledata", retry);
    return () => {
      map.off("styledata", retry);
    };
  }, [mapRef, colors]);

  return (
    <Source id={HEAT_FILL_ID} type="geojson" data={data}>
      <Layer
        id={HEAT_FILL_ID}
        type="fill"
        slot="middle"
        layout={{ visibility: visible ? "visible" : "none" }}
        paint={{
          "fill-color": ["coalesce", ["feature-state", "color"], "rgba(0, 0, 0, 0)"],
          "fill-opacity": opacity,
          // Antialiasing draws each edge twice where translucent tiles meet: a visible grid.
          "fill-antialias": false,
        }}
      />
    </Source>
  );
}
