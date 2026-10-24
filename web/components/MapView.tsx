"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import type { PickingInfo } from "@deck.gl/core";
import { useMemo } from "react";
import Map, { Layer, NavigationControl, ScaleControl } from "react-map-gl/mapbox";
import { DeckOverlay } from "@/components/DeckOverlay";
import { Legend } from "@/components/Legend";
import { createHeatLayer } from "@/components/layers/HeatLayer";
import { useHexes } from "@/components/useHexes";
import { WhenLayerExists } from "@/components/WhenLayerExists";
import { formatTemp, valueRange } from "@/lib/heat";
import { BOSTON_VIEW, BUILDINGS_LAYER_ID, MAP_STYLE } from "@/lib/mapConfig";
import { DEFAULT_LAYERS, useDashboard } from "@/lib/store";
import type { Hex } from "@/lib/types";

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

function getTooltip({ object }: PickingInfo<Hex>) {
  return object ? { text: `3pm air temp: ${formatTemp(object.temp3pm)}`, style: TOOLTIP_STYLE } : null;
}

interface MapViewProps {
  token: string;
  children?: React.ReactNode;
}

export default function MapView({ token, children }: MapViewProps) {
  const data = useHexes();
  const heatVisible = useDashboard((s) => s.layers.heat?.visible ?? true);
  const heatOpacity = useDashboard((s) => s.layers.heat?.opacity ?? DEFAULT_LAYERS.heat.opacity);

  const hexes = data.status === "ready" ? data.hexes : null;
  const range = useMemo(() => (hexes ? valueRange(hexes.map((h) => h.temp3pm)) : null), [hexes]);
  const layers = useMemo(
    () => (hexes && range && heatVisible ? [createHeatLayer(hexes, range, heatOpacity)] : []),
    [hexes, range, heatVisible, heatOpacity],
  );

  return (
    <Map
      mapboxAccessToken={token}
      mapStyle={MAP_STYLE}
      initialViewState={BOSTON_VIEW}
      maxPitch={75}
      // Reuse the underlying mapbox-gl instance across remounts (incl. React StrictMode in dev),
      // so remounting this component does not create, and bill, a new map load.
      reuseMaps
      style={{ width: "100%", height: "100%" }}
    >
      <Layer
        id={BUILDINGS_LAYER_ID}
        type="fill-extrusion"
        source="composite"
        source-layer="building"
        filter={["==", ["get", "extrude"], "true"]}
        minzoom={12}
        paint={{
          "fill-extrusion-color": "#3a3f4b",
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "min_height"],
          "fill-extrusion-opacity": 0.85,
        }}
      />
      {/* Mount deck only after its beforeId anchor exists in the style. */}
      <WhenLayerExists id={BUILDINGS_LAYER_ID}>
        <DeckOverlay layers={layers} getTooltip={getTooltip} />
      </WhenLayerExists>
      <NavigationControl position="top-left" visualizePitch />
      <ScaleControl position="bottom-right" unit="imperial" />
      {range && <Legend range={range} />}
      {data.status === "error" && (
        <p role="alert" className="absolute top-2 left-1/2 -translate-x-1/2 rounded-md bg-destructive px-3 py-1 text-xs text-white">
          Could not load heat data: {data.message}
        </p>
      )}
      {children}
    </Map>
  );
}
