"use client";

import { useEffect } from "react";
import { useMap } from "react-map-gl/mapbox";
import { layerSetting } from "@/lib/layers";
import { useDashboard } from "@/lib/store";

/** Applies the "3D buildings" layer toggle to Mapbox Standard's `show3dBuildings` config. */
export function BasemapBuildings() {
  const { current: mapRef } = useMap();
  const visible = useDashboard((s) => layerSetting(s.layers, "buildings").visible);
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const apply = () => map.setConfigProperty("basemap", "show3dBuildings", visible);
    // isStyleLoaded() is also false while sources are still loading (e.g. right after the previous
    // toggle), and "style.load" never fires again then; "idle" does, so wait for whichever comes.
    if (map.isStyleLoaded()) apply();
    else {
      map.once("style.load", apply);
      map.once("idle", apply);
    }
    return () => {
      map.off("style.load", apply);
      map.off("idle", apply);
    };
  }, [mapRef, visible]);
  return null;
}
