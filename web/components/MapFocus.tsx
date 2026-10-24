"use client";

import { useEffect } from "react";
import { useMap } from "react-map-gl/mapbox";
import { dashboardStore } from "@/lib/store";

/** Flies the map to each new store focus request. Keeps zoom ≥ 16 so 3D buildings stay visible. */
export function MapFocus() {
  const { current: mapRef } = useMap();
  useEffect(
    () =>
      dashboardStore.subscribe((s, prev) => {
        const map = mapRef?.getMap();
        if (!map || !s.focus || s.focus.seq === prev.focus?.seq) return;
        map.flyTo({ center: s.focus.lngLat, zoom: Math.max(map.getZoom(), 16), duration: 900, essential: true });
      }),
    [mapRef],
  );
  return null;
}
