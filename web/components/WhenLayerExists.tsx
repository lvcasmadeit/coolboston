"use client";

import { useEffect, useState } from "react";
import { useMap } from "react-map-gl/mapbox";

/**
 * Renders children only once the style contains layer `id`.
 *
 * Needed because deck.gl's interleaved overlay calls `map.addLayer(group, beforeId)` as soon as the
 * style loads, which throws if the `beforeId` layer (added by a react-map-gl <Layer>) isn't there yet.
 */
export function WhenLayerExists({ id, children }: { id: string; children: React.ReactNode }) {
  const { current: mapRef } = useMap();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const check = () => {
      if (map.getLayer(id)) {
        setReady(true);
        map.off("styledata", check);
      }
    };
    check();
    map.on("styledata", check);
    return () => {
      map.off("styledata", check);
    };
  }, [mapRef, id]);

  return ready ? children : null;
}
