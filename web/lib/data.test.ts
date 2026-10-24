import { describe, expect, it } from "vitest";
import { HexDataError, parseHexes } from "@/lib/data";

const hex = { id: "892a3066037ffff", temp6am: 74.1, temp3pm: 91.2, temp7pm: 84.5 };
const doc = (hexes: unknown[], extra: object = {}) => ({ version: 1, hexes, ...extra });

describe("parseHexes", () => {
  it("accepts a valid document, including null temperatures", () => {
    const nullHex = { ...hex, id: "892a306614fffff", temp6am: null, temp3pm: null, temp7pm: null };
    expect(parseHexes(doc([hex, nullHex]))).toEqual(doc([hex, nullHex]));
  });

  it.each([
    ["not an object", 42, /object/],
    ["wrong version", { version: 2, hexes: [] }, /version/],
    ["hexes not an array", { version: 1, hexes: {} }, /hexes/],
    ["extra top-level field", doc([], { foo: 1 }), /unexpected field "foo"/],
    ["missing hex field", doc([{ id: hex.id, temp6am: 1, temp7pm: 1 }]), /hexes\[0\].*missing field "temp3pm"/],
    ["extra hex field", doc([{ ...hex, score: 3 }]), /hexes\[0\].*unexpected field "score"/],
    ["non-numeric temperature", doc([{ ...hex, temp3pm: "91" }]), /hexes\[0\]\.temp3pm/],
    ["NaN temperature", doc([{ ...hex, temp3pm: Number.NaN }]), /hexes\[0\]\.temp3pm/],
    ["empty id", doc([{ ...hex, id: "" }]), /hexes\[0\]\.id/],
  ])("rejects %s with a clear error", (_label, input, message) => {
    expect(() => parseHexes(input)).toThrow(HexDataError);
    expect(() => parseHexes(input)).toThrow(message);
  });
});
