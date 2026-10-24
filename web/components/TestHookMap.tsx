"use client";

import { useEffect } from "react";
import { useMap } from "react-map-gl/mapbox";
import { exposeMap } from "@/lib/testHook";

/** Puts the mapbox-gl map on `window.__coolboston.map` for e2e tests (no-op in production). */
export function TestHookMap() {
  const { current: mapRef } = useMap();
  useEffect(() => {
    const map = mapRef?.getMap();
    if (map) exposeMap(map);
  }, [mapRef]);
  return null;
}
