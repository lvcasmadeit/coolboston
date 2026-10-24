import { describe, expect, it } from "vitest";
import { OUTSIDE_GRID, availableActions } from "@/lib/availableActions";
import type { Action, BuildingIntervention, SelectedBuilding } from "@/lib/types";

const B = (id: number): SelectedBuilding => ({ id, footprint: { type: "Polygon", coordinates: [] }, heightM: 20, roofAreaM2: 900, primaryTile: "c", tiles: [{ id: "c", overlapM2: 900 }] });
const on = (intervention: BuildingIntervention, id = 1): Action => ({ id: `${intervention}-${id}`, intervention, target: { kind: "building", building: B(id) } });
const enabled = (offers: ReturnType<typeof availableActions>) => offers.filter((o) => o.enabled).map((o) => o.spec.id);

describe("availableActions", () => {
  it("offers nothing without a selection", () => {
    expect(availableActions(null, [])).toEqual([]);
  });

  it("offers the five building actions for a fresh building", () => {
    expect(enabled(availableActions({ kind: "building", building: B(1) }, []))).toEqual([
      "solar",
      "green-roof",
      "cool-building",
      "green-walls",
      "green-roof-solar",
    ]);
  });

  it("offers only street trees for an area", () => {
    expect(enabled(availableActions({ kind: "area", cells: ["a"] }, []))).toEqual(["street-trees"]);
  });

  it("one roof action per building: other roof actions are disabled with the reason, green walls stay", () => {
    const offers = availableActions({ kind: "building", building: B(1) }, [on("green-roof")]);
    expect(enabled(offers)).toEqual(["green-walls"]);
    expect(offers.find((o) => o.spec.id === "solar")!.reason).toMatch(/One roof action per building.*Green roof/);
    expect(offers.find((o) => o.spec.id === "green-roof")!.reason).toBe("Already applied.");
  });

  it("green roof + solar is one roof action", () => {
    expect(enabled(availableActions({ kind: "building", building: B(1) }, [on("green-roof-solar")]))).toEqual(["green-walls"]);
  });

  it("green walls first leave every roof action available, but not a second wall", () => {
    const offers = availableActions({ kind: "building", building: B(1) }, [on("green-walls")]);
    expect(enabled(offers)).toEqual(["solar", "green-roof", "cool-building", "green-roof-solar"]);
  });

  it("actions on another building do not count", () => {
    expect(enabled(availableActions({ kind: "building", building: B(2) }, [on("green-roof", 1)]))).toHaveLength(5);
  });

  it("disables cooling actions for a building outside the data grid", () => {
    const offers = availableActions({ kind: "building", building: B(9) }, [], { outsideGrid: true });
    const by = Object.fromEntries(offers.map((o) => [o.spec.id, o]));
    // Every building action now cools, so none applies outside the grid.
    for (const id of ["solar", "green-roof", "cool-building", "green-walls", "green-roof-solar"])
      expect(by[id]).toMatchObject({ enabled: false, reason: OUTSIDE_GRID });
  });
});
