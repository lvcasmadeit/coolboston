/** Classic style (not Mapbox Standard) so building extrusions can be styled from our data. */
export const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";

export const BOSTON_VIEW = {
  longitude: -71.0589,
  latitude: 42.3601,
  zoom: 12.5,
  pitch: 60,
  bearing: -17,
} as const;

/** Id of our 3D building layer. Data overlays are inserted before it so buildings draw on top. */
export const BUILDINGS_LAYER_ID = "3d-buildings";

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
