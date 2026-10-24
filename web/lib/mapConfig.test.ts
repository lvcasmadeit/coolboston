import { describe, expect, it } from "vitest";
import { BASEMAP_CONFIG, BOSTON_VIEW, checkMapboxToken, MAP_STYLE } from "@/lib/mapConfig";

describe("checkMapboxToken", () => {
  it("rejects a missing or blank token", () => {
    expect(checkMapboxToken(undefined).ok).toBe(false);
    expect(checkMapboxToken("   ").ok).toBe(false);
  });

  it("rejects secret tokens, which must never ship to the browser", () => {
    const r = checkMapboxToken("sk.abc123");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/public/i);
  });

  it("accepts a public token and trims it", () => {
    expect(checkMapboxToken(" pk.abc123 ")).toEqual({ ok: true, token: "pk.abc123" });
  });
});

describe("BOSTON_VIEW", () => {
  it("is a close, pitched view over Downtown so towers read as 3D on load", () => {
    expect(BOSTON_VIEW.longitude).toBeCloseTo(-71.06, 2);
    expect(BOSTON_VIEW.latitude).toBeCloseTo(42.3555, 3);
    // Standard draws 3D buildings only from zoom 15 (3d-building minzoom).
    expect(BOSTON_VIEW.zoom).toBeGreaterThanOrEqual(15);
    expect(BOSTON_VIEW.pitch).toBe(52);
    expect(BOSTON_VIEW.bearing).toBe(-15);
  });
});

describe("basemap", () => {
  it("uses Mapbox Standard in the default day theme with 3D buildings on", () => {
    expect(MAP_STYLE).toBe("mapbox://styles/mapbox/standard");
    expect(BASEMAP_CONFIG.theme).toBe("default");
    expect(BASEMAP_CONFIG.lightPreset).toBe("day");
    expect(BASEMAP_CONFIG.show3dBuildings).toBe(true);
    expect(BASEMAP_CONFIG.show3dFacades).toBe(false);
  });

  it("has deep navy water and near-white buildings, like the reference", () => {
    expect(BASEMAP_CONFIG.colorWater).toBe("#1F4A6E");
    expect(BASEMAP_CONFIG.colorBuildings).toBe("#F3F2EF");
  });
});
