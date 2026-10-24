import { describe, expect, it } from "vitest";
import { BOSTON_VIEW, checkMapboxToken } from "@/lib/mapConfig";

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
  it("is a pitched 3D view centered on Boston", () => {
    expect(BOSTON_VIEW.longitude).toBeCloseTo(-71.06, 1);
    expect(BOSTON_VIEW.latitude).toBeCloseTo(42.36, 1);
    expect(BOSTON_VIEW.pitch).toBe(60);
  });
});
