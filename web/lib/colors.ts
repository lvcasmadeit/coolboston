export type RGB = readonly [number, number, number];
export type RGBA = [number, number, number, number];

/**
 * Rainbow blue -> cyan -> yellow -> orange -> red (planui.md M3, matching the reference mockup).
 * Saturated yellow (not pale) so the midpoint still reads on the cream basemap at 50% alpha.
 */
export const HEAT_RAMP: readonly RGB[] = [
  [44, 123, 182], // #2C7BB6 blue
  [65, 182, 196], // #41B6C4 cyan
  [249, 208, 87], // #F9D057 yellow
  [253, 141, 60], // #FD8D3C orange
  [227, 26, 28], // #E31A1C red
  [165, 0, 38], // #A50026 dark red
];

export const TRANSPARENT: RGBA = [0, 0, 0, 0];

/** Color for `value` on the heat ramp over [min, max]; clamps outside it, transparent for null. */
export function heatColor(value: number | null, min: number, max: number, alpha = 255): RGBA {
  if (value === null || !Number.isFinite(value)) return TRANSPARENT;
  const t = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const pos = t * (HEAT_RAMP.length - 1);
  const i = Math.min(Math.floor(pos), HEAT_RAMP.length - 2);
  const f = pos - i;
  const [a, b] = [HEAT_RAMP[i], HEAT_RAMP[i + 1]];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
    alpha,
  ];
}

/** CSS gradient matching HEAT_RAMP, for legends. */
export function rampCss(): string {
  return `linear-gradient(to right, ${HEAT_RAMP.map(([r, g, b]) => `rgb(${r} ${g} ${b})`).join(", ")})`;
}
