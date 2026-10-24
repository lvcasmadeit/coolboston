import { PolygonLayer } from "@deck.gl/layers";
import type { InterleavedLayerProps } from "@/components/DeckOverlay";
import type { RGB } from "@/lib/colors";
import type { Action, BuildingIntervention } from "@/lib/types";

/** One colour per building intervention (green walls draw as an outline only). */
export const ROOF_COLORS: Record<BuildingIntervention, RGB> = {
  solar: [35, 57, 91], // navy panels
  "green-roof": [62, 142, 65],
  "cool-building": [127, 200, 248], // light blue: white would vanish on Standard's white roofs
  "green-walls": [139, 195, 74],
  "green-roof-solar": [42, 111, 104],
};

/** Caps sit just above the roof so they win the depth test against the building top. */
export const ROOF_OFFSET_M = 0.4;

export interface RoofMarker {
  key: string;
  intervention: BuildingIntervention;
  /** Rings of [lng, lat, z]. */
  polygon: number[][][];
  outlineOnly: boolean;
}

/** One marker per building action and polygon; buildings without a height sit at ground level. */
export function roofMarkers(actions: readonly Action[]): RoofMarker[] {
  const out: RoofMarker[] = [];
  for (const a of actions) {
    if (a.target.kind !== "building") continue;
    const intervention = a.intervention as BuildingIntervention; // building target ⇒ building intervention (Action union)
    const b = a.target.building;
    const z = (b.heightM ?? 0) + ROOF_OFFSET_M;
    const polys = b.footprint.type === "Polygon" ? [b.footprint.coordinates] : b.footprint.coordinates;
    polys.forEach((rings, i) =>
      out.push({
        key: `${a.id}:${i}`,
        intervention,
        polygon: rings.map((ring) => ring.map(([lng, lat]) => [lng, lat, z])),
        outlineOnly: intervention === "green-walls",
      }),
    );
  }
  return out;
}

export function createRoofLayer(actions: readonly Action[], opacity: number) {
  const alpha = Math.round(opacity * 255);
  return new PolygonLayer<RoofMarker, InterleavedLayerProps>({
    id: "roof-markers",
    slot: "middle",
    data: roofMarkers(actions),
    getPolygon: (d) => d.polygon,
    filled: true,
    stroked: true,
    extruded: false,
    getFillColor: (d) => (d.outlineOnly ? [0, 0, 0, 0] : [...ROOF_COLORS[d.intervention], alpha]),
    getLineColor: (d) => [...ROOF_COLORS[d.intervention], d.outlineOnly ? alpha : Math.round(alpha * 0.9)],
    lineWidthUnits: "pixels",
    getLineWidth: (d) => (d.outlineOnly ? 3 : 1),
    pickable: false,
    parameters: { depthBias: -2, depthBiasSlopeScale: -2 },
    updateTriggers: { getFillColor: [alpha], getLineColor: [alpha] },
  });
}
