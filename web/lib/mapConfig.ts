/** Mapbox Standard basemap. Its 3D buildings can't be recolored from our data; per-building scores
 *  will need our own building tileset (planui.md 3.4). */
export const MAP_STYLE = "mapbox://styles/mapbox/standard";

/** Standard config (planui.md 3.1, 6.4): default theme in day light, cream land, deep navy water,
 *  near-white buildings (reference mockup). */
export const BASEMAP_CONFIG = {
  theme: "default",
  lightPreset: "day",
  colorLand: "#F4EFE4",
  colorWater: "#1F4A6E",
  colorGreenspace: "#D7E3C8",
  colorBuildings: "#F3F2EF",
  // Selected building (feature state `select` on the buildings featureset): sage accent.
  colorBuildingSelect: "#4F7A5A",
  showPointOfInterestLabels: false,
  showLandmarkIcons: false,
  show3dBuildings: true,
  // Off: the procedural-buildings tileset behind facades 404s for downtown Boston tiles
  // (one console error per tile); towers already get Standard's glassy models.
  show3dFacades: false,
  show3dTrees: true,
} as const;

/** Close, pitched view over Downtown (planui.md 6.5). Zoom must stay >= 15: Standard hides its 3D buildings below that. */
export const BOSTON_VIEW = {
  longitude: -71.06,
  latitude: 42.3555,
  zoom: 15.2,
  pitch: 52,
  bearing: -15,
} as const;

export type TokenCheck = { ok: true; token: string } | { ok: false; reason: string };

export function checkMapboxToken(raw: string | undefined): TokenCheck {
  const token = raw?.trim() ?? "";
  if (!token) {
    return {
      ok: false,
      reason: "NEXT_PUBLIC_MAPBOX_TOKEN is not set. Copy .env.example to web/.env.local and add a public (pk.) token.",
    };
  }
  if (!token.startsWith("pk.")) {
    return {
      ok: false,
      reason: "The Mapbox token must be a public token (starts with pk.). Never put a secret (sk.) token in the browser.",
    };
  }
  return { ok: true, token };
}
