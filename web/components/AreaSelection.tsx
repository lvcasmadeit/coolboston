"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMap } from "react-map-gl/mapbox";
import { addCells, cellsInBox, clickCell, isBox, type CellCentre, type Point } from "@/lib/areaSelect";
import { dashboardStore, useDashboard } from "@/lib/store";
import { cellCentre, tileIdAt } from "@/lib/grid";
import type { Cell } from "@/lib/types";

/**
 * Area tool (active when `tool === "area"`): click a tile to select it, shift-click to add or remove,
 * shift-drag a box to add every tile whose centre is inside it. Plain drag still pans.
 * Mapbox's own shift-drag box zoom is turned off while the tool is on.
 */
export function AreaSelection({ cells }: { cells: readonly Cell[] }) {
  const { current: mapRef } = useMap();
  const tool = useDashboard((s) => s.tool);
  const [box, setBox] = useState<{ a: Point; b: Point } | null>(null);
  const boxRef = useRef<{ a: Point; b: Point } | null>(null);

  const centres = useMemo<CellCentre[]>(
    () =>
      cells.map((c) => ({ id: c.id, centre: cellCentre(c) })),
    [cells],
  );
  const ids = useMemo(() => new Set(cells.map((c) => c.id)), [cells]);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map || tool !== "area") return;
    const canvas = map.getCanvasContainer();
    const local = (e: MouseEvent): Point => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    let down: { p: Point; shift: boolean } | null = null;

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      down = { p: local(e), shift: e.shiftKey };
      if (e.shiftKey) {
        map.dragPan.disable();
        e.preventDefault();
      }
    };
    const onMove = (e: MouseEvent) => {
      if (!down?.shift) return;
      boxRef.current = { a: down.p, b: local(e) };
      setBox(boxRef.current);
    };
    const onUp = (e: MouseEvent) => {
      if (!down) return;
      const start = down;
      const end = local(e);
      down = null;
      boxRef.current = null;
      setBox(null);
      if (start.shift) map.dragPan.enable();
      const st = dashboardStore.getState();
      const current = st.selection?.kind === "area" ? st.selection.cells : [];
      if (isBox(start.p, end)) {
        // Plain drag panned the map; only a shift-drag selects.
        if (!start.shift) return;
        const inBox = cellsInBox(centres, (ll) => map.project(ll), start.p, end);
        st.setAreaCells(addCells(current, inBox));
        return;
      }
      // The tile under the ground point (lib/grid.ts): works with the heat layer hidden.
      const { lng, lat } = map.unproject([end.x, end.y]);
      const id = tileIdAt([lng, lat]);
      if (ids.has(id)) st.setAreaCells(clickCell(current, id, start.shift));
    };

    map.boxZoom.disable();
    canvas.style.cursor = "crosshair";
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      canvas.style.cursor = "";
      map.boxZoom.enable();
      map.dragPan.enable();
      boxRef.current = null;
      setBox(null);
    };
  }, [mapRef, tool, centres, ids]);

  if (!box) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute border-2 border-primary bg-primary/15"
      style={{
        left: Math.min(box.a.x, box.b.x),
        top: Math.min(box.a.y, box.b.y),
        width: Math.abs(box.a.x - box.b.x),
        height: Math.abs(box.a.y - box.b.y),
      }}
    />
  );
}
