"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import Map, { Layer, NavigationControl, ScaleControl } from "react-map-gl/mapbox";
import { BOSTON_VIEW, BUILDINGS_LAYER_ID, MAP_STYLE } from "@/lib/mapConfig";

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
      <NavigationControl position="top-left" visualizePitch />
      <ScaleControl position="bottom-right" unit="imperial" />
      {children}
    </Map>
  );
}
