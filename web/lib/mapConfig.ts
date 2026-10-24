/** Mapbox Standard basemap. Its 3D buildings can't be recolored from our data; per-building scores
 *  will need our own building tileset (planui.md 3.4). */
export const MAP_STYLE = "mapbox://styles/mapbox/standard";

/** Standard config (planui.md 3.1): faded theme in day light, tinted to the app's cream palette. */
export const BASEMAP_CONFIG = {
  theme: "faded",
  lightPreset: "day",
  colorLand: "#F4EFE4",
  colorWater: "#C9DCE3",
  colorGreenspace: "#D7E3C8",
  colorBuildings: "#EDE6D8",
  showPointOfInterestLabels: false,
  showLandmarkIcons: false,
  show3dBuildings: true,
  show3dTrees: true,
} as const;

export const BOSTON_VIEW = {
  longitude: -71.0589,
  latitude: 42.3601,
  zoom: 12.5,
  pitch: 60,
  bearing: -17,
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
