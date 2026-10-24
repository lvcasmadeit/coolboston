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

---

# Part 2: Map look v2 (match the reference mockup)

Goal: make the map read like the reference screenshot: a fine grid of heat tiles raised into a translucent slab that swallows low-rise blocks while towers punch through, on a basemap with deep-blue water, white buildings and a closer downtown camera.

Status: **V1–V5 done; Checkpoint V awaiting review.**

## 5. What the reference shows vs. what we have

| Element | Reference | Now | Gap |
|---|---|---|---|
| Tiles | ~50–80 m cells, seamless | H3 res 9, edge 201 m, 1,147 cells | 2.6× too coarse |
| Tile height | uniform slab ~15–20 m; low-rise inside it is tinted, towers stick out | flat (0 m) | needs extrusion + correct draw order |
| Ramp | blue → cyan → yellow → orange → red, fixed 85–115 °F **surface** temp | amber → maroon over data min/max (87.8–94.2 °F **air** temp) | ramp and range belong to Landsat (Phase 2) |
| Water | deep navy blue | pale `#C9DCE3` | config change |
| Buildings | white/light gray, glassy towers | cream `#EDE6D8` | config change |
| Camera | zoom ~14.5, pitch ~50, centered on Downtown | zoom 12.5, pitch 60, wider | `BOSTON_VIEW` |
| Ground outside tiles | photo-like | flat cream | out of scope (see 6.4) |

The reference is an illustrated mockup (green roofs and solar panels are painted in), so the target is the overall impression, not a pixel match.

## 6. Plan

### 6.1 Smaller tiles (M1)
Move the grid to **H3 res 10**: edge 76 m, 8,044 cells over Boston (measured). Res 11 (29 m, 56,461 cells) is finer than Landsat's native 100 m thermal resolution, so it would show false precision and push `hexes.json` past ~5 MB once yearly values are added.

Honesty caveat: the Heat Watch source hexes are ~25 ha, so at res 10 each source hex just repeats across ~17 cells and the map looks blocky, not fine. Smaller tiles only gain real detail from Landsat (Phase 2). Options:
- **(a) Recommended:** switch to res 10 now; accept blocky Heat Watch until Landsat lands in Phase 2.
- (b) Keep res 9 for Heat Watch, use res 10 only for Landsat (two grids; more complexity in scoring).
- (c) Use the Heat Watch modeled rasters (CAPA publishes area-wide rasters; the OSF repo is the likely source, **not yet verified**) for real sub-hex detail now.

Change: `RESOLUTION = 10` in `grid.py`; re-run `build_hexes`. The `hexes.json` contract does not change (ids stay strings). Expected size ~550 KB (7× today's 81 KiB).

### 6.2 Raised tile slab (M2)
`H3HexagonLayer` with `extruded: true`, constant `getElevation` = **18 m** (above triple-deckers and brownstones at ~10–17 m, well under downtown towers at 100 m+). Optionally scale height slightly with temperature later; the reference uses a flat slab.

Draw order decides the look (needs a spike, ~20 min):
- Slab drawn **after** Standard's `3d-building`: low-rise inside the slab gets tinted by the translucent top/sides, towers rise above it untouched. This is the reference look.
- Slab drawn **before** buildings while writing depth: building parts inside the slab fail the depth test and vanish, so the slab looks like an opaque plate.
- Spike: confirm where deck's `middle` group lands relative to `3d-building` (index 155 of the basemap import's 190 layers); if before it, try `slot: "top"` (risk: covers labels) or `depthWriteEnabled: false` on the slab so buildings still draw inside it.
- Drop the `depthBias` once the slab is raised, since its top face is no longer coplanar with the ground. Re-check the 14/390 → 351/390 draw count to confirm.
- Translucent extrusions show their inner side walls through the top face; check it at 50% opacity, and fall back to `material: false` or 0.6 opacity if it looks muddy.

### 6.3 Ramp (M3)
The reference ramp is a blue → red rainbow over a fixed 85–115 °F surface-temperature range. That fits **Landsat** (wide range) but not Heat Watch (6 °F spread: it would all render yellow). Plan:
- Keep amber → maroon for Heat Watch now.
- In Phase 2, add a diverging `LST_RAMP` (Turbo-like, perceptually ordered; avoid raw jet) on a fixed range shared across years, and make it the default layer.

### 6.4 Basemap (M4)
Stay on **Mapbox Standard**. I checked **Standard Satellite** (photo ground like the reference): it has no `3d-building` layer and no water or building color config (only `lightPreset`), so it can't do the slab-and-towers look.

Config changes on Standard:
```ts
colorWater: "#1F4A6E",      // deep navy (reference harbor)
colorBuildings: "#F3F2EF",  // near-white towers
show3dFacades: true,        // window detail where Mapbox has it (mostly near landmarks)
theme: "default",           // "faded" desaturates everything, incl. the navy water. Verify both.
```
Keep land cream so the app chrome still matches; place labels stay on (the reference labels neighborhoods).

### 6.5 Camera (M5)
`BOSTON_VIEW` → center `[-71.0600, 42.3555]`, zoom **14.3**, pitch **52**, bearing **-15**. Tighter on Downtown so towers read as 3D on first load.

## 7. Decisions

| # | Question | Decision |
|---|---|---|
| M1 | Tile size | **Res 10 now**, option (a). Approved; blocky until Phase 2. |
| M2 | Slab height | **Flat 18 m.** Approved. |
| M3 | Rainbow ramp | **Now**, overriding the proposal: blue → red rainbow on Heat Watch, over the data min/max until Landsat's fixed range in Phase 2. Replaces amber → maroon (D2). |
| M4 | Theme | **`default`**; `faded` dropped (replaces D3). |
| M5 | Camera | **Closer Downtown view** (6.5). Approved. |

## 8. Tasks

### V1: Draw-order spike [S, do first]
- [x] 18 m extruded slab on the current res-9 data; screenshots for both draw orders; pick the setting that tints low-rise and leaves towers untouched. No commit unless it works. *Result: `middle` slot with normal depth write; `depthWriteEnabled: false` or `top` lose the tint.*

### V2: H3 res 10 [S]
- [x] `RESOLUTION = 10`; pipeline tests still pass; `hexes.json` regenerated and size noted; `/api/hexes` and the map still load.

### V3: Raised slab [M]
- [x] Extruded heat layer with the V1 setting, 18 m, 50% fill alpha; `HeatLayer.test.ts` covers `extruded` and elevation.
- [x] Verify: tilted downtown screenshot shows towers above the slab; hover tooltip still works.

### V4: Basemap and camera [S]
- [x] Water, buildings, facades, theme (M4), `BOSTON_VIEW` (M5); `mapConfig.test.ts` updated. *Deviations: zoom 15.2, not 14.3 (Standard draws 3D buildings only from zoom 15); `show3dFacades` off (its tiles 404 downtown).*
- [x] Verify: screenshot next to the reference.

### V4b: Rainbow ramp [S]
- [x] `HEAT_RAMP` → blue → cyan → yellow → orange → red; colors tests still pass; legend follows.

### V5: Docs [S]
- [x] PLAN.md and todo.md: grid resolution, slab, Phase 2 `LST_RAMP` note.

### Checkpoint V
- [x] All checks pass (41 web tests, 13 pytest, typecheck, lint, build); screenshots at 1440×900 and 1280×720 compared with the reference.
- [ ] Review with human.
