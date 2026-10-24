"use client";

import { useHexes } from "@/components/useHexes";
import { heatModel, type HeatModel } from "@/lib/heatModel";

export type HeatModelState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; model: HeatModel };

/** Hex data plus its fixed base model, shared by the map and the panels. */
export function useHeatModel(): HeatModelState {
  const data = useHexes();
  if (data.status !== "ready") return data;
  const model = heatModel(data.hexes);
  return model ? { status: "ready", model } : { status: "error", message: "hexes.json has no temperature data" };
}
