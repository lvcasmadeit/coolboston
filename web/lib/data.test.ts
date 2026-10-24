import { describe, expect, it } from "vitest";
import { HexDataError, parseHexes } from "@/lib/data";

const hex = { id: "8a2a3066037ffff", temp3pm: 91.2, surface: 101.4 };
const doc = (hexes: unknown[], extra: object = {}) => ({ version: 3, hexes, ...extra });

describe("parseHexes", () => {
  it("accepts a valid document, including null temperatures", () => {
    const nullHex = { ...hex, id: "8a2a306614fffff", temp3pm: null, surface: null };
    expect(parseHexes(doc([hex, nullHex]))).toEqual(doc([hex, nullHex]));
  });

  it.each([
    ["not an object", 42, /object/],
    ["old v1 file", { version: 1, hexes: [] }, /unsupported version 1, expected 3/],
    ["v2 file (no surface)", { version: 2, hexes: [{ id: hex.id, temp3pm: 91 }] }, /unsupported version 2, expected 3/],
    ["hexes not an array", { version: 3, hexes: {} }, /hexes/],
    ["missing surface", doc([{ id: hex.id, temp3pm: 91 }]), /hexes\[0\].*missing field \"surface\"/],
    ["non-numeric surface", doc([{ ...hex, surface: "hot" }]), /hexes\[0\]\.surface/],
    ["extra top-level field", doc([], { foo: 1 }), /unexpected field "foo"/],
    ["missing hex field", doc([{ id: hex.id }]), /hexes\[0\].*missing field "temp3pm"/],
    ["extra hex field", doc([{ ...hex, score: 3 }]), /hexes\[0\].*unexpected field "score"/],
    ["dropped v1 field", doc([{ ...hex, temp6am: 74 }]), /hexes\[0\].*unexpected field "temp6am"/],
    ["non-numeric temperature", doc([{ ...hex, temp3pm: "91" }]), /hexes\[0\]\.temp3pm/],
    ["NaN temperature", doc([{ ...hex, temp3pm: Number.NaN }]), /hexes\[0\]\.temp3pm/],
    ["empty id", doc([{ ...hex, id: "" }]), /hexes\[0\]\.id/],
  ])("rejects %s with a clear error", (_label, input, message) => {
    expect(() => parseHexes(input)).toThrow(HexDataError);
    expect(() => parseHexes(input)).toThrow(message);
  });
});
