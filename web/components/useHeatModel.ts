"use client";

import { useCells } from "@/components/useCells";
import { heatModel, type HeatModel } from "@/lib/heatModel";

export type HeatModelState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; model: HeatModel };

/** Tile data plus its fixed base model, shared by the map and the panels. */
export function useHeatModel(): HeatModelState {
  const data = useCells();
  if (data.status !== "ready") return data;
  const model = heatModel(data.cells);
  return model ? { status: "ready", model } : { status: "error", message: "cells.json has no temperature data" };
}
