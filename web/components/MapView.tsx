"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useMemo } from "react";
import Map, { NavigationControl, ScaleControl } from "react-map-gl/mapbox";
import { AreaSelection } from "@/components/AreaSelection";
import { BasemapBuildings } from "@/components/BasemapBuildings";
import { BuildingSelection } from "@/components/BuildingSelection";
import { DeckOverlay } from "@/components/DeckOverlay";
import { HeatFill } from "@/components/HeatFill";
import { HeatHover } from "@/components/HeatHover";
import { Legend } from "@/components/Legend";
import { MapFocus } from "@/components/MapFocus";
import { TestHookMap } from "@/components/TestHookMap";
import { buildDeckLayers } from "@/components/layers/buildLayers";
import { ToolToggle } from "@/components/ToolToggle";
import { useHeatModel } from "@/components/useHeatModel";
import { computeDeltas } from "@/lib/cooling";
import { maxChangePct, type HeatView } from "@/lib/heatView";
import { layerSetting } from "@/lib/layers";
import { BASEMAP_CONFIG, BOSTON_VIEW, MAP_STYLE } from "@/lib/mapConfig";
import { useDashboard } from "@/lib/store";
import { installTestHook } from "@/lib/testHook";

interface MapViewProps {
  token: string;
  children?: React.ReactNode;
}

export default function MapView({ token, children }: MapViewProps) {
  const data = useHeatModel();
  const layerState = useDashboard((s) => s.layers);
  const heat = layerSetting(layerState, "heat");
  const actions = useDashboard((s) => s.actions);
  const metric = useDashboard((s) => s.metric);
  const mode = useDashboard((s) => s.viewMode);

  useEffect(installTestHook, []);

  // Fixed base model (lookup, baseline, colour ranges), shared with the panels.
  const base = data.status === "ready" ? data.model : null;
  const cells = base?.cells ?? null;
  const byId = base?.byId ?? null;
  const deltas = useMemo(() => computeDeltas(actions), [actions]);
  const view = useMemo<Omit<HeatView, "opacity"> | null>(
    () => base && { metric, mode, deltas, baseline: base.baseline, ranges: base.ranges },
    [base, metric, mode, deltas],
  );
  const maxPct = useMemo(
    () => (base ? maxChangePct(base.byId, metric, deltas, base.baseline) : 0),
    [base, metric, deltas],
  );
  const areaCells = useDashboard((s) => (s.selection?.kind === "area" ? s.selection.cells : null));
  const layers = useMemo(
    () => buildDeckLayers({ byId, actions, areaCells, layers: layerState }),
    [byId, actions, areaCells, layerState],
  );

  return (
    <Map
      mapboxAccessToken={token}
      mapStyle={MAP_STYLE}
      config={{ basemap: BASEMAP_CONFIG }}
      initialViewState={BOSTON_VIEW}
      maxPitch={75}
      // Reuse the underlying mapbox-gl instance across remounts (incl. React StrictMode in dev),
      // so remounting this component does not create, and bill, a new map load.
      reuseMaps
      style={{ width: "100%", height: "100%" }}
    >
      {cells && view && <HeatFill cells={cells} view={view} maxPct={maxPct} visible={heat.visible} opacity={heat.opacity} />}
      <DeckOverlay layers={layers} />
      {byId && view && <HeatHover byId={byId} view={view} enabled={heat.visible} />}
      <BuildingSelection />
      <MapFocus />
      <BasemapBuildings />
      <TestHookMap />
      {cells && <AreaSelection cells={cells} />}
      <ToolToggle />
      <NavigationControl position="top-left" visualizePitch />
      <ScaleControl position="bottom-right" unit="imperial" />
      {base && <Legend metric={metric} mode={mode} range={base.ranges[metric]} maxPct={maxPct} />}
      {data.status === "error" && (
        <p role="alert" className="absolute top-2 left-1/2 -translate-x-1/2 rounded-md bg-destructive px-3 py-1 text-xs text-white">
          Could not load heat data: {data.message}
        </p>
      )}
      {children}
    </Map>
  );
}
