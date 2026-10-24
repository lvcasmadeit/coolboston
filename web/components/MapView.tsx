"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import type { PickingInfo } from "@deck.gl/core";
import { useEffect, useMemo } from "react";
import Map, { NavigationControl, ScaleControl } from "react-map-gl/mapbox";
import { AreaSelection } from "@/components/AreaSelection";
import { BasemapBuildings } from "@/components/BasemapBuildings";
import { BuildingSelection } from "@/components/BuildingSelection";
import { DeckOverlay } from "@/components/DeckOverlay";
import { Legend } from "@/components/Legend";
import { MapFocus } from "@/components/MapFocus";
import { buildDeckLayers } from "@/components/layers/buildLayers";
import { ToolToggle } from "@/components/ToolToggle";
import { useHexes } from "@/components/useHexes";
import { computeDeltas } from "@/lib/cooling";
import { formatTemp, quantileRange, valueRange, type Range } from "@/lib/heat";
import { afterValue, baseValue, changePct, maxChangePct, type HeatView } from "@/lib/heatView";
import { computeBaseline } from "@/lib/impact";
import { BASEMAP_CONFIG, BOSTON_VIEW, MAP_STYLE } from "@/lib/mapConfig";
import { useDashboard } from "@/lib/store";
import { installTestHook } from "@/lib/testHook";
import type { Hex, Metric } from "@/lib/types";

// Deck's default tooltip is dark; style it with the light tokens.
const TOOLTIP_STYLE = {
  backgroundColor: "var(--card)",
  color: "var(--foreground)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  boxShadow: "0 1px 3px rgba(43, 41, 37, 0.15)",
  padding: "6px 8px",
  fontSize: "12px",
};

const METRIC_LABEL: Record<Metric, string> = { air: "3pm air temp", surface: "Surface temp (mid-morning)" };

/** Tooltip for the current view: base value, plus after value and % change when the hex is treated. */
function makeTooltip(view: Omit<HeatView, "opacity"> | null) {
  return ({ object }: PickingInfo<Hex>) => {
    if (!object || !view) return null;
    const base = baseValue(object, view.metric);
    const after = afterValue(object, view.metric, view.deltas);
    let text = `${METRIC_LABEL[view.metric]}: ${formatTemp(base)}`;
    if (base !== null && after !== null && after !== base) {
      const pct = changePct(object, view.metric, view.deltas, view.baseline);
      text += ` → ${formatTemp(after)} (est.)\nHeat island: ${pct === null ? "n/a" : `−${pct.toFixed(1)}%`}`;
    }
    return { text, style: TOOLTIP_STYLE };
  };
}

interface MapViewProps {
  token: string;
  children?: React.ReactNode;
}

export default function MapView({ token, children }: MapViewProps) {
  const data = useHexes();
  const layerState = useDashboard((s) => s.layers);
  const actions = useDashboard((s) => s.actions);
  const metric = useDashboard((s) => s.metric);
  const mode = useDashboard((s) => s.viewMode);

  useEffect(installTestHook, []);

  const hexes = data.status === "ready" ? data.hexes : null;
  // Fixed baseline: computed once from the base data, never from after-action values.
  const base = useMemo(() => {
    if (!hexes) return null;
    const air = valueRange(hexes.map((h) => h.temp3pm));
    const surface = quantileRange(hexes.map((h) => h.surface));
    if (!air || !surface) return null;
    return {
      ranges: { air, surface } satisfies Record<Metric, Range>,
      baseline: computeBaseline(hexes),
      byId: new globalThis.Map(hexes.map((h) => [h.id, h])),
    };
  }, [hexes]);
  const deltas = useMemo(() => computeDeltas(actions), [actions]);
  const view = useMemo<Omit<HeatView, "opacity"> | null>(
    () => base && { metric, mode, deltas, baseline: base.baseline, ranges: base.ranges },
    [base, metric, mode, deltas],
  );
  const maxPct = useMemo(
    () => (base ? maxChangePct(base.byId, metric, deltas, base.baseline) : 0),
    [base, metric, deltas],
  );
  const getTooltip = useMemo(() => makeTooltip(view), [view]);
  const areaCells = useDashboard((s) => (s.selection?.kind === "area" ? s.selection.cells : null));
  const layers = useMemo(
    () => buildDeckLayers({ hexes, view, maxPct, actions, areaCells, layers: layerState }),
    [hexes, view, maxPct, actions, areaCells, layerState],
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
      <DeckOverlay layers={layers} getTooltip={getTooltip} />
      <BuildingSelection />
      <MapFocus />
      <BasemapBuildings />
      {hexes && <AreaSelection hexes={hexes} />}
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
