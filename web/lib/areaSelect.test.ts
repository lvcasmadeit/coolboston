import { describe, expect, it } from "vitest";
import { addCells, cellsInBox, clickCell, isBox, type CellCentre } from "@/lib/areaSelect";

describe("clickCell", () => {
  it("plain click replaces the selection with one cell", () => {
    expect(clickCell(["a", "b"], "c", false)).toEqual(["c"]);
    expect(clickCell(["a", "b"], "a", false)).toEqual(["a"]);
  });

  it("shift-click adds, and removes an already selected cell", () => {
    expect(clickCell(["a"], "b", true)).toEqual(["a", "b"]);
    expect(clickCell(["a", "b"], "a", true)).toEqual(["b"]);
    expect(clickCell(["a"], "a", true)).toEqual([]);
  });
});

describe("cellsInBox", () => {
  // Mocked projection: lng -> x, lat -> y (screen y grows downward, so negate lat).
  const project = ([lng, lat]: [number, number]) => ({ x: lng * 100, y: -lat * 100 });
  const cells: CellCentre[] = [
    { id: "in", centre: [1, -1] },
    { id: "edge", centre: [2, -2] },
    { id: "out-x", centre: [3, -1] },
    { id: "out-y", centre: [1, -3] },
  ];

  it("returns cells whose projected centre is inside the box, edges included", () => {
    expect(cellsInBox(cells, project, { x: 50, y: 50 }, { x: 200, y: 200 })).toEqual(["in", "edge"]);
  });

  it("works for a box dragged in any direction", () => {
    expect(cellsInBox(cells, project, { x: 200, y: 200 }, { x: 50, y: 50 })).toEqual(["in", "edge"]);
    expect(cellsInBox(cells, project, { x: 200, y: 50 }, { x: 50, y: 200 })).toEqual(["in", "edge"]);
  });

  it("an empty box selects nothing", () => {
    expect(cellsInBox(cells, project, { x: 500, y: 500 }, { x: 600, y: 600 })).toEqual([]);
  });
});

describe("addCells", () => {
  it("unions without duplicates, preserving order", () => {
    expect(addCells(["a", "b"], ["b", "c", "c", "d"])).toEqual(["a", "b", "c", "d"]);
  });
});

describe("isBox", () => {
  it("treats tiny drags as clicks", () => {
    expect(isBox({ x: 0, y: 0 }, { x: 3, y: 3 })).toBe(false);
    expect(isBox({ x: 0, y: 0 }, { x: 4, y: 0 })).toBe(true);
  });
});
