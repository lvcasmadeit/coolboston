"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-map-gl/mapbox";
import { BUILDINGS_TARGET, toSelectedBuilding } from "@/lib/buildings";
import { dashboardStore } from "@/lib/store";

const CLICK_BUILDING = "coolboston-building-click";
const CLICK_GROUND = "coolboston-ground-click";

type MapboxMap = NonNullable<ReturnType<typeof useMap>["current"]> extends { getMap(): infer M } ? M : never;

/** mapbox-gl 3.33 accepts `{id, target}` at runtime (Style#setFeatureState resolves the featureset's
 *  layers), but its types only allow a full TargetFeature, so cast at this one call site. */
function setSelect(map: MapboxMap, id: string | number, select: boolean) {
  const selector = { id, target: BUILDINGS_TARGET } as unknown as Parameters<MapboxMap["setFeatureState"]>[0];
  map.setFeatureState(selector, { select });
}

/**
 * Click a Standard 3D building to select it; click empty ground or press Escape to clear.
 * The selected building gets feature state `select`, drawn in the `colorBuildingSelect` config colour.
 * Renders nothing; must sit inside <Map>.
 */
export function BuildingSelection() {
  const { current: mapRef } = useMap();
  const highlighted = useRef<string | number | null>(null);

  // Map interactions. The building handler returns true, which stops the ground handler firing.
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const add = () => {
      map.addInteraction(CLICK_BUILDING, {
        type: "click",
        target: BUILDINGS_TARGET,
        handler: (e) => {
          if (dashboardStore.getState().tool !== "building") return false;
          const building = e.feature && toSelectedBuilding(e.feature);
          if (!building) return false;
          dashboardStore.getState().selectBuilding(building);
          return true;
        },
      });
      map.addInteraction(CLICK_GROUND, {
        type: "click",
        handler: () => {
          if (dashboardStore.getState().selection?.kind === "building") dashboardStore.getState().clearSelection();
        },
      });
    };
    if (map.isStyleLoaded()) add();
    else map.once("style.load", add);
    return () => {
      map.off("style.load", add);
      map.removeInteraction(CLICK_BUILDING);
      map.removeInteraction(CLICK_GROUND);
    };
  }, [mapRef]);

  // Keep the feature-state highlight in sync with the store (covers clicks, Escape and area selection).
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const sync = () => {
      const s = dashboardStore.getState().selection;
      const next = s?.kind === "building" ? s.building.id : null;
      if (next === highlighted.current) return;
      if (highlighted.current !== null)
        setSelect(map, highlighted.current, false);
      if (next !== null) setSelect(map, next, true);
      highlighted.current = next;
    };
    sync();
    const unsub = dashboardStore.subscribe(sync);
    return () => {
      unsub();
      if (highlighted.current !== null && map.style)
        setSelect(map, highlighted.current, false);
      highlighted.current = null;
    };
  }, [mapRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dashboardStore.getState().clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
