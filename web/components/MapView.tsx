"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import Map, { Layer, NavigationControl, ScaleControl } from "react-map-gl/mapbox";
import { DeckOverlay, type InterleavedLayerProps } from "@/components/DeckOverlay";
import { WhenLayerExists } from "@/components/WhenLayerExists";
import { BOSTON_VIEW, BUILDINGS_LAYER_ID, MAP_STYLE } from "@/lib/mapConfig";

// Task 6 spike: three hard-coded H3 res-9 cells downtown. Replaced by real hexes in Task 10.
const SPIKE_CELLS = [
  { id: "892a3066037ffff", color: [239, 68, 68] },
  { id: "892a306614fffff", color: [249, 115, 22] },
  { id: "892a3066007ffff", color: [250, 204, 21] },
] as const;

const spikeLayer = new H3HexagonLayer<(typeof SPIKE_CELLS)[number], InterleavedLayerProps>({
  id: "spike-hexes",
  beforeId: BUILDINGS_LAYER_ID,
  data: SPIKE_CELLS,
  getHexagon: (d) => d.id,
  getFillColor: (d) => [...d.color, 170],
  extruded: false,
  stroked: true,
  getLineColor: [255, 255, 255, 200],
  lineWidthMinPixels: 1,
});

interface MapViewProps {
  token: string;
  children?: React.ReactNode;
}

export default function MapView({ token, children }: MapViewProps) {
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
        <DeckOverlay layers={[spikeLayer]} />
      </WhenLayerExists>
      <NavigationControl position="top-left" visualizePitch />
      <ScaleControl position="bottom-right" unit="imperial" />
      {children}
    </Map>
  );
}
