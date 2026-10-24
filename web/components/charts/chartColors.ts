import { ROOF_COLORS } from "@/components/layers/RoofLayer";
import type { Intervention } from "@/lib/types";

const rgb = ([r, g, b]: readonly number[]) => `rgb(${r} ${g} ${b})`;

/** Chart colour per intervention: the roof-marker colours, plus a tree green. */
export const INTERVENTION_CSS: Record<Intervention, string> = {
  solar: rgb(ROOF_COLORS.solar),
  "green-roof": rgb(ROOF_COLORS["green-roof"]),
  "cool-building": rgb(ROOF_COLORS["cool-building"]),
  "green-walls": rgb(ROOF_COLORS["green-walls"]),
  "green-roof-solar": rgb(ROOF_COLORS["green-roof-solar"]),
  "street-trees": "rgb(34 120 60)",
};
