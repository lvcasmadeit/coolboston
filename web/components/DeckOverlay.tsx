"use client";

import { MapboxOverlay, type MapboxOverlayProps } from "@deck.gl/mapbox";
import { useEffect } from "react";
import { useMap } from "react-map-gl/mapbox";

/**
 * Per-layer props understood by MapboxOverlay in interleaved mode. deck.gl supports these at
 * runtime but doesn't export the type, so pass it as a layer's extra-props generic:
 * `new H3HexagonLayer<Datum, InterleavedLayerProps>({ beforeId: ..., ... })`.
 */
export type InterleavedLayerProps = {
  beforeId?: string;
  slot?: "bottom" | "middle" | "top";
};

type MapInstance = NonNullable<ReturnType<typeof useMap>["current"]> extends { getMap(): infer M } ? M : never;

// One overlay per mapbox-gl instance, kept for the map's lifetime (the map itself is reused via
// `reuseMaps`). react-map-gl's useControl adds/removes the control on every mount, and under
// React StrictMode the two overlapping deck instances race to attach to the same WebGL context
// ("WebGL context already attached"), leaving no deck layers rendered in dev.
const overlays = new WeakMap<MapInstance, MapboxOverlay>();

/**
 * deck.gl rendered *inside* the Mapbox WebGL context (interleaved), so deck layers share the
 * depth buffer with Mapbox's 3D buildings and can be ordered among Mapbox layers.
 *
 * Layering rule (verified in Task 6): give ground-level data layers `beforeId: BUILDINGS_LAYER_ID`
 * so they draw beneath the building extrusions and buildings occlude them when the map is pitched.
 */
export function DeckOverlay(props: Omit<MapboxOverlayProps, "interleaved">) {
  const { current: mapRef } = useMap();

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    let overlay = overlays.get(map);
    if (!overlay) {
      overlay = new MapboxOverlay({ ...props, interleaved: true });
      overlays.set(map, overlay);
      map.addControl(overlay);
    } else {
      overlay.setProps({ ...props, interleaved: true });
    }
  });

  // Clear layers (but keep the overlay attached) when this component unmounts.
  useEffect(() => {
    const map = mapRef?.getMap();
    return () => {
      if (map) overlays.get(map)?.setProps({ layers: [] });
    };
  }, [mapRef]);

  return null;
}
