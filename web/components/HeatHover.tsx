"use client";

import { useEffect, useState } from "react";
import { useMap } from "react-map-gl/mapbox";
import { tileIdAt } from "@/lib/grid";
import { tileTooltip, type HeatView } from "@/lib/heatView";
import type { Cell } from "@/lib/types";

/**
 * Tooltip for the tile under the cursor. The tile comes from the ground point under the cursor
 * (lib/grid.ts), not from rendered features, so it is cheap and needs no layer query.
 * Hidden while the heat layer is hidden. Never intercepts clicks.
 */
export function HeatHover({ byId, view, enabled }: { byId: ReadonlyMap<string, Cell>; view: Omit<HeatView, "opacity">; enabled: boolean }) {
  const { current: mapRef } = useMap();
  const [hover, setHover] = useState<{ x: number; y: number; id: string } | null>(null);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map || !enabled) return;
    let frame = 0;
    let last: { x: number; y: number; lng: number; lat: number } | null = null;
    const onMove = (e: { point: { x: number; y: number }; lngLat: { lng: number; lat: number } }) => {
      last = { ...e.point, ...e.lngLat };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!last) return;
        const id = tileIdAt([last.lng, last.lat]);
        setHover(byId.has(id) ? { x: last.x, y: last.y, id } : null);
      });
    };
    const onLeave = () => {
      last = null;
      setHover(null);
    };
    map.on("mousemove", onMove);
    map.on("mouseout", onLeave);
    // The ground under a still cursor changes when the camera moves: hide until the next move.
    map.on("movestart", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      map.off("mousemove", onMove);
      map.off("mouseout", onLeave);
      map.off("movestart", onLeave);
      setHover(null);
    };
  }, [mapRef, byId, enabled]);

  const cell = hover && byId.get(hover.id);
  if (!hover || !cell) return null;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 whitespace-pre rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground shadow-sm"
      style={{ left: hover.x + 12, top: hover.y + 12 }}
    >
      {tileTooltip(cell, view)}
    </div>
  );
}
