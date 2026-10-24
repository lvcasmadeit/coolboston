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
    if (map.isStyleLoaded()) apply();
    else map.once("style.load", apply);
    return () => {
      map.off("style.load", apply);
    };
  }, [mapRef, visible]);
  return null;
}
