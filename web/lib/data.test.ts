import { describe, expect, it } from "vitest";
import { CELLS_URL, CellDataError, parseCells } from "@/lib/data";
import { CELLS_SCHEMA_VERSION } from "@/lib/types";

describe("CELLS_URL", () => {
  it("carries the schema version so a schema bump bypasses cached responses", () => {
    expect(CELLS_URL).toBe(`/api/cells?v=${CELLS_SCHEMA_VERSION}`);
  });
});

const RING = [[-71.06, 42.36], [-71.059, 42.36], [-71.059, 42.361], [-71.06, 42.36]];
const full = { id: "2363_9011", landAreaM2: 10_000, coords: null, temp3pm: 91.2, surface: 101.4 };
const clipped = { id: "2364_9011", landAreaM2: 4_200.5, coords: [[RING]], temp3pm: null, surface: null };
const doc = (cells: unknown[], extra: object = {}) => ({ version: 4, cellSizeM: 100, crs: "EPSG:26986", cells, ...extra });

describe("parseCells", () => {
  it("accepts a valid document: full tiles without coords, clipped tiles with them, null temperatures", () => {
    expect(parseCells(doc([full, clipped]))).toEqual(doc([full, clipped]));
  });

  it.each([
    ["not an object", 42, /object/],
    ["v3 hex file", { version: 3, hexes: [] }, /missing field "cellSizeM"/],
    ["wrong version", doc([], { version: 3 }), /unsupported version 3, expected 4/],
    ["wrong cell size", doc([], { cellSizeM: 30 }), /cellSizeM/],
    ["wrong crs", doc([], { crs: "EPSG:4326" }), /crs/],
    ["cells not an array", doc({} as unknown as unknown[]), /cells must be an array/],
    ["extra top-level field", doc([], { foo: 1 }), /unexpected field "foo"/],
    ["missing cell field", doc([{ id: full.id, temp3pm: 1, surface: 1, landAreaM2: 1 }]), /cells\[0\].*missing field "coords"/],
    ["extra cell field", doc([{ ...full, score: 3 }]), /cells\[0\].*unexpected field "score"/],
    ["H3 id", doc([{ ...full, id: "8a2a3066037ffff" }]), /cells\[0\]\.id/],
    ["zero land area", doc([{ ...full, landAreaM2: 0 }]), /landAreaM2/],
    ["land area over a full tile", doc([{ ...full, landAreaM2: 10_001 }]), /landAreaM2/],
    ["empty coords", doc([{ ...clipped, coords: [] }]), /coords/],
    ["short ring", doc([{ ...clipped, coords: [[RING.slice(1)]] }]), /at least 4/],
    ["open ring", doc([{ ...clipped, coords: [[[...RING.slice(0, 3), [-71.05, 42.36]]]] }]), /not closed/],
    ["non-numeric surface", doc([{ ...full, surface: "hot" }]), /cells\[0\]\.surface/],
    ["NaN temperature", doc([{ ...full, temp3pm: Number.NaN }]), /cells\[0\]\.temp3pm/],
  ])("rejects %s with a clear error", (_label, input, message) => {
    expect(() => parseCells(input)).toThrow(CellDataError);
    expect(() => parseCells(input)).toThrow(message);
  });
});
