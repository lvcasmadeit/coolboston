import { describe, expect, it } from "vitest";
import { LAYERS, layerSetting } from "@/lib/layers";
import { DEFAULT_LAYERS } from "@/lib/store";

describe("layer registry", () => {
  it("every layer has a default in the store", () => {
    for (const l of LAYERS) expect(DEFAULT_LAYERS[l.id], l.id).toBeDefined();
  });

  it("falls back to defaults for missing state", () => {
    expect(layerSetting({}, "roofs")).toEqual(DEFAULT_LAYERS.roofs);
    expect(layerSetting({ roofs: { visible: false, opacity: 0.3 } }, "roofs")).toEqual({ visible: false, opacity: 0.3 });
  });

  it("only basemap buildings lack an opacity control", () => {
    expect(LAYERS.filter((l) => !l.hasOpacity).map((l) => l.id)).toEqual(["buildings"]);
  });
});
