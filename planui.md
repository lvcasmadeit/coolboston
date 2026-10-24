# CoolBoston UI revamp: light theme + Mapbox Standard

Goal: move from the dark FireTrace look to a light, warm, calm interface (off-white and cream surfaces) on the Mapbox Standard basemap, with hexes at 50% opacity. Done before Phase 2 so later UI (timeline, charts, Layers tab) is built on the new palette.

Status: **U1–U5 done; Checkpoint U awaiting review.**

---

## 1. Decisions

| # | Question | Decision |
|---|---|---|
| D1 | Accent color | **Sage green** `#4F7A5A`. Approved. |
| D2 | Heat ramp | **Sequential amber → red → maroon**, see 3.2. Approved. |
| D3 | Standard theme | **`theme: "faded"`** + `lightPreset: "day"`, land tinted cream. Approved. |
| D4 | Standard extras | Hide POI labels and landmark icons; keep 3D trees and 3D buildings. Approved. |
| D5 | Dark mode | **Dropped.** Light only. The `.dark` token block and the `dark` class on `<html>` are removed, not left unused. |

---

## 2. Palette (app chrome)

Warm neutrals, all text AA-contrast on its surface. Values go into `:root` in `web/app/globals.css`.

| Token | Use | Value | Notes |
|---|---|---|---|
| `--background` | page, map gutters | `#F7F3EA` cream | |
| `--card` / `--popover` | top bar, right panel, bottom panel, legend | `#FDFBF6` off-white | one step lighter than background |
| `--muted` | tab list, inputs, chart boxes | `#EFE9DC` | |
| `--border` / `--input` | dividers | `#E3DCCB` | |
| `--foreground` | body text | `#2B2925` warm charcoal | 13.1:1 on cream |
| `--muted-foreground` | secondary text | `#6B6457` | 5.3:1 on cream, 4.8:1 on muted (AA) |
| `--primary` | selected tab, primary buttons, focus ring | `#4F7A5A` sage (D1) | white text on it 4.9:1; as text on cream 4.45:1, just under AA, so large text or icons only |
| `--destructive` | errors | `#B4412F` | |
| `--chart-1..5` | Recharts series | `#4F7A5A`, `#C98A3D`, `#8A6FA8`, `#3F7F9E`, `#A8A091` | distinct from the heat ramp |

## 3. Map

### 3.1 Mapbox Standard config
`mapStyle="mapbox://styles/mapbox/standard"`, configured via the style's config properties (verified against the live style schema):

```ts
{ theme: "faded", lightPreset: "day",
  colorLand: "#F4EFE4", colorWater: "#C9DCE3", colorGreenspace: "#D7E3C8",
  colorBuildings: "#EDE6D8",
  showPointOfInterestLabels: false, showLandmarkIcons: false,
  show3dBuildings: true, show3dTrees: true }
```

### 3.2 Heat ramp (D2)
Sequential, starts at a mid-amber so the coolest hexes still read against cream at 50% opacity:

`#FDD08A` → `#F9A65A` → `#EE7543` → `#D8452F` → `#A8202C` → `#6E0F25`

The legend keeps its min/max labels. `HEAT_RAMP` in `lib/colors.ts` stays the single source (the Landsat PNGs in Task 15 reuse it).

### 3.3 Layering on Standard
Standard has no `composite` source, so our own `3d-buildings` fill-extrusion layer and the `beforeId` anchor go away. Hexes use `slot: "middle"` (above roads, below labels and 3D buildings). **This needs re-verifying**, as Task 6 did for the dark style: tilt the map and check that Standard's buildings occlude the hexes.

### 3.4 Impact on later tasks
- **Per-building scores** (PLAN.md "Task 7", todo Tasks 29–31): Standard's buildings take one color (`colorBuildings`) plus highlight/select states, not data-driven colors. Plan: when we get there, set `show3dBuildings: false` and add our own building tileset as a `fill-extrusion` in a slot. Our building data comes from our own tileset anyway, not Mapbox's `composite`. No work now, but PLAN.md's "use a classic style, not Standard" decision gets updated.
- Standard is heavier (3D trees, lighting). Check pan and tilt stay smooth; if not, set `show3dTrees: false`.

---

## 4. Tasks

### U1: Hex opacity 50% [S]
- [x] `DEFAULT_LAYERS.heat.opacity` = 0.5 in `lib/store.ts`; store test updated.
- [x] Fill alpha carries the opacity, layer `opacity` stays 1: deck gamma-corrects the prop (0.5 drew as 0.73). Measured in-browser: 0.502.

### U2: Light palette tokens [M]
- [x] `:root` tokens from section 2; `dark` class removed from `app/layout.tsx`.
- [x] Top bar, right panel, bottom panel, legend, tooltip and error banner restyled on the tokens (no hard-coded dark colors left; `grep` for `bg-black`, `white/`, `dark:`). *shadcn `components/ui/*` keep their `dark:` utilities; inert without the `dark` class.*
- [x] Verify: screenshots at 1280×720 and 1440×900; text contrast spot-checked (AA).

### U3: Mapbox Standard basemap [M]
- [x] `MAP_STYLE` → Standard; config from 3.1 applied (react-map-gl's `config={{ basemap }}` prop) (via `config` on the style import or `map.setConfigProperty("basemap", ...)` on load, whichever react-map-gl 8 supports cleanly).
- [x] Remove the custom `3d-buildings` layer and `WhenLayerExists`; hex layer uses `slot: "middle"` plus `depthBias: -2` (without it only 14/390 on-screen hexes drew; with it 351/390).
- [x] `mapConfig.test.ts` updated.
- [x] Verify: with the real token, pitched screenshot shows cream land, 3D buildings occluding hexes, no console errors; no duplicate map loads on reload. *One style request per page load; a dev hot-reload was not separately counted.*

### U4: New heat ramp [S]
- [x] `HEAT_RAMP` → section 3.2 stops; `colors.test.ts` still passes (tests are stop-agnostic).
- [x] Verify: screenshot; coolest and hottest hexes distinguishable at 50% opacity.

### U5: Docs [S]
- [x] PLAN.md decisions updated (Standard style, light theme, slot layering, building-coloring plan).
- [x] tasks/todo.md: Task 4 "Dark theme" and Task 5 "Classic dark style" notes amended.

### Checkpoint U
- [x] `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` pass
- [x] Light UI + Standard map + 50% hexes verified with screenshots
- [ ] Review with human before Phase 2
