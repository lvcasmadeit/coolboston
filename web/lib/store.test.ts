import { beforeEach, describe, expect, it } from "vitest";
import { createDashboardStore, DEFAULT_LAYERS } from "@/lib/store";
import { MAX_YEAR, MIN_YEAR } from "@/lib/types";

const LAYERS = {
  heat: { visible: true, opacity: 1 },
  canopy: { visible: false, opacity: 0.7 },
};

describe("default layers", () => {
  it("shows heat hexes at 50% opacity", () => {
    expect(DEFAULT_LAYERS.heat).toEqual({ visible: true, opacity: 0.5 });
    expect(createDashboardStore().getState().layers.heat.opacity).toBe(0.5);
  });
});

let store: ReturnType<typeof createDashboardStore>;
beforeEach(() => {
  store = createDashboardStore(LAYERS);
});

describe("dashboard store", () => {
  it("has the documented defaults", () => {
    const s = store.getState();
    expect(s.year).toBe(MAX_YEAR);
    expect(s.isPlaying).toBe(false);
    expect(s.speed).toBe(1);
    expect(s.intervention).toBe("green-roof");
    expect(s.selectedHexId).toBeNull();
    expect(s.layers).toEqual(LAYERS);
  });

  it("does not share layer state between stores", () => {
    store.getState().toggleLayer("heat");
    expect(createDashboardStore(LAYERS).getState().layers.heat.visible).toBe(true);
  });

  it("clamps and rounds the year to the data range", () => {
    store.getState().setYear(1999);
    expect(store.getState().year).toBe(MIN_YEAR);
    store.getState().setYear(2100);
    expect(store.getState().year).toBe(MAX_YEAR);
    store.getState().setYear(2018.6);
    expect(store.getState().year).toBe(2019);
  });

  it("plays and pauses", () => {
    store.getState().play();
    expect(store.getState().isPlaying).toBe(true);
    store.getState().pause();
    expect(store.getState().isPlaying).toBe(false);
  });

  it("sets speed and intervention", () => {
    store.getState().setSpeed(4);
    store.getState().setIntervention("solar");
    expect(store.getState().speed).toBe(4);
    expect(store.getState().intervention).toBe("solar");
  });

  it("selects and clears a hex", () => {
    store.getState().selectHex("892a3066a2fffff");
    expect(store.getState().selectedHexId).toBe("892a3066a2fffff");
    store.getState().selectHex(null);
    expect(store.getState().selectedHexId).toBeNull();
  });

  it("toggles one layer without touching others", () => {
    store.getState().toggleLayer("canopy");
    expect(store.getState().layers.canopy.visible).toBe(true);
    expect(store.getState().layers.heat).toEqual(LAYERS.heat);
  });

  it("clamps layer opacity to 0-1", () => {
    store.getState().setLayerOpacity("heat", 1.5);
    expect(store.getState().layers.heat.opacity).toBe(1);
    store.getState().setLayerOpacity("heat", -0.2);
    expect(store.getState().layers.heat.opacity).toBe(0);
    store.getState().setLayerOpacity("heat", 0.4);
    expect(store.getState().layers.heat.opacity).toBe(0.4);
  });

  it("ignores unknown layer ids", () => {
    const before = store.getState().layers;
    store.getState().toggleLayer("nope");
    store.getState().setLayerOpacity("nope", 0.5);
    expect(store.getState().layers).toBe(before);
  });
});
