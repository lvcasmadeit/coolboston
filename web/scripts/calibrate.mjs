// Prints the fitted Heat Score anchors: the unweighted 2nd–98th percentile (nearest rank, as
// lib/heat.ts quantileRange) of each input over non-null tiles in data/cells.json, to 0.1 °F.
// Copy the values into lib/heatScoreConfig.ts. Usage: npm run calibrate
import { readFileSync } from "node:fs";

const { cells } = JSON.parse(readFileSync(new URL("../data/cells.json", import.meta.url), "utf8"));

function quantiles(values, lo = 0.02, hi = 0.98) {
  const v = values.filter((x) => x !== null).sort((a, b) => a - b);
  const at = (q) => v[Math.min(v.length - 1, Math.max(0, Math.round(q * (v.length - 1))))];
  return { min: Math.round(at(lo) * 10) / 10, max: Math.round(at(hi) * 10) / 10, n: v.length };
}

const air = quantiles(cells.map((c) => c.temp3pm));
const surface = quantiles(cells.map((c) => c.surface));
console.log(`tiles: ${cells.length} (air ${air.n}, surface ${surface.n})`);
console.log(
  `anchorsF: { air: { min: ${air.min}, max: ${air.max} }, surface: { min: ${surface.min}, max: ${surface.max} } },`,
);
