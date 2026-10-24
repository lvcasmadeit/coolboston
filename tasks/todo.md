# Task List: CoolBoston, interactive heat-island interventions

Overview, architecture, risks and index: `plan.md`. Direction changed Sat 12:33: select a building or area, apply a cooling action, see the heat map cool. Timeline, Landsat and the adoption simulator are dropped. Phases 0–1 below are the completed record.

Conventions
- Web commands run in `web/`: tests `npm test` (Vitest, `vitest run`), build `npm run build`, lint `npm run lint`.
- Pipeline commands run in `pipeline/`: tests `uv run pytest`.
- Tier: **MVP** = must ship, **STRETCH** = cut if behind.
- Every task ends with a working app (or a working pipeline script). Do not start a task with a red build.
- Scope: XS = 1 file, S = 1-2, M = 3-5. Nothing is larger than M.

---

## Phase 0: Foundation

### Task 1: Repo scaffold [MVP, XS]
**Description:** Initialize the repo skeleton so every later task has a place to put files.

**Acceptance criteria:**
- [x] `git init` done; `web/`, `pipeline/`, `tasks/` exist.
- [x] `.gitignore` ignores `node_modules`, `.next`, `.venv`, `__pycache__`, `.env*.local`, `pipeline/cache/`, `.env`.
- [x] `.env.example` contains `NEXT_PUBLIC_MAPBOX_TOKEN=`.

**Verification:**
- [x] `git status` shows no secrets or build output tracked.

**Dependencies:** None
**Files likely touched:** `.gitignore`, `.env.example`

### Task 2: Next.js app and tooling [MVP, M]
**Description:** Create the Next.js app (App Router, TypeScript, Tailwind) and install the tooling used by every later task.

**Acceptance criteria:**
- [x] `web/` runs with `npm run dev` and shows the default page.
- [x] shadcn/ui initialised; Vitest configured with a path alias matching `tsconfig`.
- [x] Dependencies installed with pinned (exact) versions: `mapbox-gl`, `react-map-gl`, `deck.gl` (plus `@deck.gl/mapbox`, `@deck.gl/geo-layers`, `@deck.gl/layers`), `zustand`, `recharts`, `vitest`.
- [x] One trivial passing Vitest test proves the runner works.

**Verification:**
- [x] `npm test` passes
- [x] `npm run build` succeeds
- [x] `npm run lint` passes

**Dependencies:** Task 1
**Files likely touched:** `web/package.json`, `web/vitest.config.ts`, `web/tsconfig.json`, `web/components.json`, `web/lib/smoke.test.ts`

### Task 3: Zustand store with core state [MVP, S]
**Description:** One store holds the state the whole UI shares, so later tasks only read and write it.

**Acceptance criteria:**
- [x] State: `year` (default 2025), `isPlaying` (false), `speed` (1), `intervention` (default `green-roof`), `selectedHexId` (null), `layers` (map of id → `{visible, opacity}`).
- [x] Actions: `setYear`, `play`, `pause`, `setSpeed`, `setIntervention`, `selectHex`, `toggleLayer`, `setLayerOpacity`.
- [x] `setYear` clamps to 2013-2025; `setLayerOpacity` clamps to 0-1.

**Verification:**
- [x] Tests pass: defaults, clamping, `toggleLayer`, `selectHex(null)` clears.

**Dependencies:** Task 2
**Files likely touched:** `web/lib/store.ts`, `web/lib/store.test.ts`, `web/lib/types.ts`

### Task 4: Dashboard layout shell [MVP, M]
**Description:** FireTrace-style frame: top bar, center map area, right panel with tabs, bottom timeline area, all with placeholder content.

**Acceptance criteria:**
- [x] CSS grid layout fills the viewport with no page scroll: top bar, map slot, right panel (~320px), bottom panel (~220px).
- [x] Right panel has tabs: Layers, Analysis, Simulate, Methodology (placeholders).
- [x] Top bar shows the app name and an intervention dropdown (wired to the store).
- [x] Dark theme; layout holds from 1280px up. *(Superseded by the UI revamp: light cream palette, dark mode removed. See planui.md.)*

**Verification:**
- [x] `npm run build` succeeds
- [x] Manual check: resize the window, confirm no overflow and tabs switch.

**Dependencies:** Task 3
**Files likely touched:** `web/app/layout.tsx`, `web/app/page.tsx`, `web/components/TopBar.tsx`, `web/components/RightPanel.tsx`, `web/components/BottomPanel.tsx`

### Task 5: 3D Mapbox map, client-only [MVP, M]
**Description:** Boston in 3D inside the map slot. The map is mounted once so it is not recreated on re-render (each creation is billed as a map load).

**Acceptance criteria:**
- [x] `MapView` loaded via `dynamic(() => import(...), { ssr: false })`.
- [x] Classic dark style (not Standard) *(superseded: now Mapbox Standard, default theme, navy water; camera zoom 15.2 / pitch 52 over Downtown; see planui.md)*, centered near `[-71.0589, 42.3601]`, pitch 60, zoom ~12.5.
- [x] A `fill-extrusion` layer extrudes buildings using `height` from the vector tiles; Mapbox attribution visible.
- [x] Missing token shows a readable error message instead of a blank page.

**Verification:**
- [x] `npm run build` succeeds (no `window is not defined`)
- [x] Manual check: pan, rotate, tilt work; reloading dev server does not spawn extra maps (check the console).

**Dependencies:** Task 4
**Files likely touched:** `web/components/MapView.tsx`, `web/components/MapClient.tsx`, `web/app/page.tsx`

### Task 6: deck.gl interleaved overlay spike [MVP, S]
**Description:** Prove deck.gl layers render correctly beneath/among the 3D buildings before building on it.

**Acceptance criteria:**
- [x] `MapboxOverlay` in interleaved mode attached to the map.
- [x] A test `ScatterplotLayer` or `H3HexagonLayer` with 3 hard-coded cells renders in Boston.
- [x] Layer draws below building extrusions using `beforeId`/`slot`; recorded in a code comment with the working setting.

**Verification:**
- [x] Manual check: tilt the map; hexes sit on the ground and buildings occlude them correctly.

**Dependencies:** Task 5
**Files likely touched:** `web/components/MapView.tsx`, `web/components/DeckOverlay.tsx`

### Checkpoint A: After Tasks 1-6
- [x] `npm test`, `npm run lint`, `npm run build` all pass
- [x] 3D Boston renders inside the dashboard frame with a deck.gl layer on it
- [x] Review with human before proceeding
- [x] Visual check against real Mapbox tiles (needs NEXT_PUBLIC_MAPBOX_TOKEN in web/.env.local)

Notes from Phase 0:
- Tokens are checked for the pk. prefix; sk. tokens are rejected so they never ship to the browser.
- deck.gl overlay is a per-map singleton (not react-map-gl useControl); useControl raced under React StrictMode ("WebGL context already attached") and rendered nothing in dev.
- Deck mounts only after the 3d-buildings layer exists (`WhenLayerExists`), because addLayer with a missing beforeId throws. *(Removed in the UI revamp: Standard uses slots, not beforeId.)*
- Layering verified offline with a stubbed style + synthetic building tiles: hexes draw beneath extrusions and are occluded by them, in dev and prod.
- `@playwright/test` installed early (needed for Task 46; used now for screenshots).

---

## Phase 1: Heat hexes on the map

### Task 7: Pipeline scaffold, Boston boundary, H3 grid [MVP, M]
**Description:** Python project that generates the H3 resolution-9 cells covering Boston. *(Now resolution 10, 8,044 cells; see planui.md M1.)*

**Acceptance criteria:**
- [x] `pipeline/` is a uv project (pinned versions): `geopandas`, `h3`, `shapely`, `pytest`.
- [x] `grid.py` fetches/loads the Boston boundary (Analyze Boston municipal boundary) and returns the list of H3 res-9 cell IDs whose centers fall inside it (use `h3.polygon_to_cells`).
- [x] Output ID list is deterministic and contains no duplicates.

**Verification:**
- [x] `uv run pytest`: a small fixture polygon returns the expected cell count; all IDs are valid H3 res 9.
- [x] Manual check: count is plausible (roughly 1-3k cells).

**Dependencies:** Task 1
**Files likely touched:** `pipeline/pyproject.toml`, `pipeline/src/grid.py`, `pipeline/tests/test_grid.py`, `pipeline/data/raw/boston_boundary.geojson`

### Task 8: Heat Watch ingest and area-weighted join [MVP, M]
**Description:** Bring the 2019 Heat Watch hexes (6am, 3pm, 7pm temperature and heat index) onto our H3 grid.

**Acceptance criteria:**
- [x] `heatwatch.py` loads the "Canopy Change Assessment: Heat Metrics" hex layer (MassGIS / Analyze Boston).
- [x] Each H3 cell receives an area-weighted mean of the overlapping source hexes for `temp_3pm`, `temp_6am`, `temp_7pm` (°F) in the grid CRS.
- [x] Cells with no overlap get `null`, not 0.

**Verification:**
- [x] `uv run pytest`: two overlapping fixture polygons with known values give the expected weighted mean; a non-overlapping cell is `null`.

**Dependencies:** Task 7
**Files likely touched:** `pipeline/src/heatwatch.py`, `pipeline/src/join.py`, `pipeline/tests/test_join.py`

### Task 9: hexes.json writer and /api/hexes [MVP, M]
**Description:** Define the data contract between pipeline and web, then serve it.

**Acceptance criteria:**
- [x] `build_hexes.py` writes `web/data/hexes.json`: `{ "version": 1, "hexes": [{ "id", "temp3pm", ... }] }`; field names documented in `web/lib/types.ts`.
- [x] `GET /api/hexes` returns the file with `Cache-Control` set.
- [x] Response type is validated at load time (missing/extra fields throw a clear error).

**Verification:**
- [x] `uv run pytest`: written JSON matches schema.
- [x] `npm test`: loader rejects a malformed fixture.
- [x] Manual check: `curl localhost:3000/api/hexes` returns data.

**Dependencies:** Tasks 3, 8
**Files likely touched:** `pipeline/src/build_hexes.py`, `web/app/api/hexes/route.ts`, `web/lib/data.ts`, `web/lib/data.test.ts`, `web/lib/types.ts`

### Task 10: Heat hex layer, color ramp, tooltip [MVP, M]
**Description:** Render the hexes colored by temperature.

**Acceptance criteria:**
- [x] `H3HexagonLayer` shows all hexes, colored by `temp3pm` with a continuous ramp (cool blue → hot red; briefly amber → maroon, now a blue → red rainbow on an 18 m translucent slab, see planui.md Part 2); `null` cells are transparent.
- [x] Hover tooltip shows the temperature in °F, rounded to 1 decimal.
- [x] Legend with min/max values in the Layers tab or map corner.

**Verification:**
- [x] `npm test`: ramp returns the first color at min, the last at max, clamps outside the range, handles null.
- [x] Manual check: downtown/dense areas look hotter than parks.

**Dependencies:** Tasks 6, 9
**Files likely touched:** `web/lib/colors.ts`, `web/lib/colors.test.ts`, `web/components/layers/HeatLayer.ts`, `web/components/Legend.tsx`

### Checkpoint B: After Tasks 7-10
- [x] `uv run pytest` and `npm test` pass; `npm run build` succeeds
- [x] Heat hexes are visible on the 3D map with hover values
- [x] Review with human before proceeding *(reviewed; led to the UI and map revamp in planui.md)*

---

## UI and map revamp (done)
Tracked in `../planui.md`: light cream palette, Mapbox Standard (default theme, navy water), 50% opacity measured at 0.502, H3 res 10 (8,044 cells), 18 m translucent slab, rainbow ramp, Downtown camera at zoom 15.2. Checkpoints U and V passed.

---

## Phase 2: Pivot cleanup

### Task 11: Rewrite PLAN.md for the new direction [MVP, XS]
**Description:** PLAN.md still describes the Landsat timeline and the adoption simulator. Make it describe the select → act → cool loop.

**Acceptance criteria:**
- [x] Goal, features, data sources and architecture match `plan.md`; Landsat, timeline and per-hex scoring are removed or moved to a short "Dropped" section with the reason.
- [x] Mapbox/deck.gl findings (slots, 18 m slab, gamma-corrected opacity, zoom ≥ 15) are kept.

**Verification:**
- [x] `grep -i "timeline\|landsat\|playback" PLAN.md` only hits the "Dropped" section.

**Dependencies:** None
**Files likely touched:** `PLAN.md`

### Task 12: Store refactor: drop timeline state, add selection and actions [MVP, S]
**Description:** Replace year/playback state with the state the new loop needs.

**Acceptance criteria:**
- [x] Removed: `year`, `isPlaying`, `speed`, `setYear`, `play`, `pause`, `setSpeed`, `intervention`, `setIntervention`, `selectedHexId`/`selectHex`; `MIN_YEAR`, `MAX_YEAR`, `PlaybackSpeed` from `types.ts`.
- [x] Added: `selection: { kind: "building", building } | { kind: "area", cells: string[] } | null`; `actions: Action[]`; `viewMode: "heat" | "change"`.
- [x] Actions: `selectBuilding`, `toggleAreaCell`, `setAreaCells`, `clearSelection`, `addAction`, `removeAction(id)`, `undo`, `resetActions`, `setViewMode`. Action ids are unique; `undo` removes the most recent action.
- [x] Layer state (`layers`, `toggleLayer`, `setLayerOpacity`) is unchanged.

**Verification:**
- [x] `npm test`: defaults; selecting a building replaces an area selection and vice versa; toggling a cell twice removes it; add/remove/undo/reset; old year tests deleted (not skipped).

**Dependencies:** None
**Files likely touched:** `web/lib/store.ts`, `web/lib/store.test.ts`, `web/lib/types.ts`

### Task 13: Layout refactor: remove timeline UI and the intervention dropdown [MVP, M]
**Description:** The frame should host the new loop: map, a right panel for selection and actions, and a bottom panel for impact.

**Acceptance criteria:**
- [x] Top bar: app name and location only; intervention dropdown removed.
- [x] Right panel tabs: **Act** (selection + actions, placeholder), **Layers**, **Method**; Analysis and Simulate tabs removed.
- [x] Bottom panel: "Impact" placeholder (no "Timeline" or "Summer 2013–2025" text).
- [x] No component reads removed store fields.
- [x] `recharts` uninstalled (no charts in the new direction).

**Verification:**
- [x] `npm run typecheck`, `npm run lint`, `npm run build` pass.
- [x] Manual check: screenshots at 1280×720 and 1440×900, no overflow, tabs switch.

**Dependencies:** Task 12
**Files likely touched:** `web/components/TopBar.tsx`, `web/components/RightPanel.tsx`, `web/components/BottomPanel.tsx`

### Task 13b: Drop 6am/7pm temperatures from the data [MVP, S]
**Description:** The app is 3pm-only, so stop shipping the unused time-of-day values.

**Acceptance criteria:**
- [x] `build_hexes.py` writes only `id` and `temp3pm`; `HEXES_SCHEMA_VERSION` bumped to 2 on both sides; `Hex` type and `parseHexes` updated; `heatwatch.py` loads only the 3pm field.
- [x] `hexes.json` regenerated.

**Verification:**
- [x] `uv run pytest` and `npm test` pass (fixtures updated; loader rejects a v1 file with a clear error).

**Dependencies:** None
**Files likely touched:** `pipeline/src/coolboston/heatwatch.py`, `pipeline/src/coolboston/build_hexes.py`, `pipeline/tests/*`, `web/lib/types.ts`, `web/lib/data.ts`, `web/lib/data.test.ts`, `web/data/hexes.json`

Note: Task 13 landed before Task 12 so every commit builds (the dropdown had to stop reading `intervention` before the store dropped it). Data v2 kept 8,044 cells / 7,908 with data / 87.75–94.48 °F; file 571 → 321 KiB.

### Checkpoint C: After Tasks 11-13b
- [x] All tests pass; build succeeds; map and heat slab unchanged
- [x] No timeline, year, time-of-day or simulator references left in `web/` (`grep -ri "year\|timeline\|playback\|6am\|7pm" web/components web/lib`)

---

## Phase 3: Selection (highest risk)

### Task 14: Intervention catalog and cooling coefficients [MVP, S]
**Description:** One table defining every action: where it applies, how much it cools, and where the number comes from.

**Acceptance criteria:**
- [ ] `interventions.ts` lists: building actions `green-roof`, `cool-roof`, `solar`; area actions `trees`, `cool-pavement`, `depave` (impervious → green space).
- [ ] Each entry: `id`, `label`, `appliesTo: "building" | "area"`, `coolingF: { low, central, high }` (°F air-temperature reduction at 3pm per 100% of a hex's area treated), `reachRings` (how far the effect spreads on the H3 grid), `coverage` (area actions only: the fixed share of the selected area that gets treated, justified in `note`), `source` (citation + URL), `note`.
- [ ] Coefficients researched and cited: EPA Heat Island Compendium and at least one peer-reviewed field or modelling study per action. Solar also carries `kwhPerSqftYear` for Boston with a source.
- [ ] No unsourced numbers; `low ≤ central ≤ high`.

**Verification:**
- [ ] `npm test`: every action has a source and valid ranges; every area action has a `coverage` in (0, 1]; building actions and area actions are disjoint and complete.

**Dependencies:** None
**Files likely touched:** `web/lib/interventions.ts`, `web/lib/interventions.test.ts`

### Task 15: Geometry helpers [MVP, S]
**Description:** Pure helpers shared by selection and the cooling model.

**Acceptance criteria:**
- [ ] `h3-js` added as a pinned direct dependency (same version deck.gl resolves, 4.5.0).
- [ ] `footprintAreaM2(polygon | multipolygon)` (geodesic, holes subtracted); `buildingCell(polygon)` → res-10 cell of the centroid; `HEX_AREA_M2` from h3, not hard-coded.

**Verification:**
- [ ] `npm test`: a ~100 m × 100 m square near Boston ≈ 10,000 m² (±1%); a polygon with a hole subtracts it; centroid cell is valid res 10.

**Dependencies:** None
**Files likely touched:** `web/lib/geo.ts`, `web/lib/geo.test.ts`, `web/package.json`

### Task 16: Building selection spike [MVP, S]
**Description:** Prove Standard's `buildings` featureset gives us what we need before building on it.

**Acceptance criteria:**
- [ ] `map.addInteraction` click on `{ featuresetId: "buildings", importId: "basemap" }` logs the feature's id, properties and geometry type.
- [ ] Record in a code comment: is there a stable id; is `height` present; is the footprint whole or tile-clipped (check a building on a tile edge); does feature-state `select` color the building.
- [ ] Decision written in `plan.md`: proceed with Standard, or switch to the fallback (downtown footprint GeoJSON).

**Verification:**
- [ ] Manual check: click 5 buildings including one tall tower and one on a tile edge; record results.

**Dependencies:** Task 15
**Files likely touched:** `web/components/MapView.tsx` (spike, may be reverted)

### Task 17: Building selection and highlight [MVP, M]
**Description:** Click a building to select it.

**Acceptance criteria:**
- [ ] Clicking a building sets `selection = { kind: "building", building: { id, footprint, heightM, roofAreaM2, cell } }`; the building is highlighted (feature state `select`, sage `colorBuildingSelect`).
- [ ] Clicking another building moves the highlight; Escape or clicking empty ground clears it.
- [ ] Hex hover tooltip still works; a building click takes priority over a hex click.

**Verification:**
- [ ] `npm test`: feature → `SelectedBuilding` mapping (area, cell, missing height handled).
- [ ] Manual check: select, reselect, Escape; no console errors.

**Dependencies:** Tasks 12, 16
**Files likely touched:** `web/components/MapView.tsx`, `web/lib/buildings.ts`, `web/lib/buildings.test.ts`

### Task 18: Area selection on hexes [MVP, M]
**Description:** Select an area as a set of hexes.

**Acceptance criteria:**
- [ ] With the area tool on: click a hex to select it, shift-click to add or remove, shift-drag a box to add every hex whose center is inside the box.
- [ ] Selected cells draw with a thick sage outline on top of the slab.
- [ ] Selecting an area clears a building selection and vice versa; Escape clears.

**Verification:**
- [ ] `npm test`: box → cells (screen-to-geo projection mocked), toggle logic.
- [ ] Manual check: box-select a few blocks in Chinatown; plain drag still pans.

**Dependencies:** Task 12
**Files likely touched:** `web/components/layers/SelectionLayer.ts`, `web/lib/areaSelect.ts`, `web/lib/areaSelect.test.ts`, `web/components/MapView.tsx`

### Checkpoint D: After Tasks 14-18
- [ ] All tests pass; build succeeds
- [ ] A building and an area can each be selected and cleared
- [ ] Spike decision recorded; review with human before proceeding

---

## Phase 4: Cooling model

### Task 19: Cooling model [MVP, M]
**Description:** Pure function from the action list to adjusted temperatures.

**Acceptance criteria:**
- [ ] `Action = { id, intervention, target: building | area cells }`; coverage comes from the catalog, not the action.
- [ ] Building action: treated area = roof area; source ΔT in the building's cell = `coolingF.central × treatedArea / HEX_AREA_M2`.
- [ ] Area action: each selected cell treated at the catalog's fixed `coverage` of its area.
- [ ] Spread: cell at ring k ≤ `reachRings` gets `source ΔT × 0.5^k`; effects from multiple actions add; total reduction per cell capped (cap documented with its source, e.g. the largest observed park cool-island effect).
- [ ] `applyActions(hexes, actions)` → `{ adjusted: Map<cell, temp>, delta: Map<cell, ΔT> }`; cells with null base temperature stay null; no actions → identical to base.
- [ ] Recomputes only affected cells; < 20 ms for 50 actions on 8,044 hexes.

**Verification:**
- [ ] `npm test`: no actions = identity; one building gives the hand-computed ΔT at k=0 and halves per ring; two actions add; cap respected; null preserved; removing an action restores the values; timing test.

**Dependencies:** Tasks 14, 15
**Files likely touched:** `web/lib/cooling.ts`, `web/lib/cooling.test.ts`

### Task 20: Heat layer driven by adjusted temperatures [MVP, S]
**Description:** The slab recolors as actions are added.

**Acceptance criteria:**
- [ ] Heat layer colors by `adjusted` temperature, on a color domain fixed to the **baseline** min/max (legend shows the baseline range).
- [ ] Memoized on the action list; `updateTriggers` so only colors update, never the map.
- [ ] Tooltip shows "92.4 °F → 92.1 °F (−0.3 °F est.)" for affected cells.

**Verification:**
- [ ] `npm test`: domain stays at baseline after actions; tooltip formatter.
- [ ] Manual check (via a temporary dev-only button or console hook): add a large area action and see the colors shift toward blue.

**Dependencies:** Tasks 12, 19
**Files likely touched:** `web/components/layers/HeatLayer.ts`, `web/components/MapView.tsx`, `web/lib/heat.ts`, `web/lib/heat.test.ts`

### Checkpoint E: After Tasks 19-20
- [ ] All tests pass; build succeeds
- [ ] An action added through a test hook visibly cools the map around it
- [ ] Review the size of effects with the human: realistic but small, or adjust the Change view first

---

## Phase 5: Action UI and visuals

### Task 21: Action panel [MVP, M]
**Description:** The Act tab shows the selection and the actions that apply to it.

**Acceptance criteria:**
- [ ] Building selected: roof area (sq ft), height, base temperature of its hex; buttons for green roof, cool roof, solar, each with a one-line description and its estimated local ΔT before applying.
- [ ] Area selected: cell count and area (acres); buttons for trees, cool pavement, depave, each stating the fixed share it treats (e.g. "plants trees on 25% of the area").
- [ ] Nothing selected: instructions ("Click a building, or use the area tool").
- [ ] Applying an action adds it to the store; a building can't receive the same action twice (button shows "Applied").

**Verification:**
- [ ] `npm test`: available actions per selection kind; duplicate prevention.
- [ ] Manual check: apply a green roof and see the map cool.

**Dependencies:** Tasks 14, 17, 18, 20
**Files likely touched:** `web/components/ActPanel.tsx`, `web/components/RightPanel.tsx`

### Task 22: Active interventions list [MVP, S]
**Description:** See and manage what has been applied.

**Acceptance criteria:**
- [ ] List of actions (icon, label, target summary, estimated ΔT), each with a remove button; Undo and Reset all buttons.
- [ ] Clicking an item flies the map to its target.

**Verification:**
- [ ] `npm test`: list derived from the store; remove and reset update it.

**Dependencies:** Task 21
**Files likely touched:** `web/components/ActionList.tsx`

### Task 23: Roof markers on treated buildings [MVP, S]
**Description:** Show what was done to each building.

**Acceptance criteria:**
- [ ] A deck `SolidPolygonLayer` caps each treated roof at the building's height: green for green roof, near-white for cool roof, dark blue for solar.
- [ ] Markers draw above the slab and are removed with their action.

**Verification:**
- [ ] `npm test`: marker data derived from actions (color per intervention, elevation = height).
- [ ] Manual check: tilted view shows the green roof on the right building.

**Dependencies:** Tasks 17, 22
**Files likely touched:** `web/components/layers/RoofLayer.ts`, `web/components/MapView.tsx`

### Task 24: Change view and legend [MVP, S]
**Description:** Make small, realistic effects visible.

**Acceptance criteria:**
- [ ] Toggle Heat / Change. Change colors only affected cells by ΔT on a blue scale from 0 to the current max ΔT; unaffected cells fade out.
- [ ] Legend switches with the mode and labels values as estimates.

**Verification:**
- [ ] `npm test`: change-ramp domain from `delta`; zero-delta cells transparent.
- [ ] Manual check: a single green roof is visible in Change view.

**Dependencies:** Task 20
**Files likely touched:** `web/components/layers/HeatLayer.ts`, `web/components/Legend.tsx`, `web/lib/colors.ts`

### Checkpoint F: After Tasks 21-24 (MVP core loop)
- [ ] All tests pass; build succeeds
- [ ] Select building → green roof → map cools → remove → map restores; same for an area with trees
- [ ] Review with human before proceeding

---

## Phase 6: Impact summary

### Task 25: Impact metrics [MVP, S]
**Description:** Numbers that summarise the scenario.

**Acceptance criteria:**
- [ ] `impactSummary(hexes, result, actions)`: mean ΔT over affected cells, max ΔT, affected area (acres), roof area treated (sq ft), area treated (acres), estimated solar kWh/year.
- [ ] Before/after mean 3pm temperature of the affected cells.

**Verification:**
- [ ] `npm test`: fixture scenario gives the hand-computed values; empty scenario gives zeros.

**Dependencies:** Task 19
**Files likely touched:** `web/lib/impact.ts`, `web/lib/impact.test.ts`

### Task 26: Impact cards [MVP, M]
**Description:** The bottom Impact panel: numbers only, no chart.

**Acceptance criteria:**
- [ ] Cards: Before, After, ΔT, area cooled, energy offset (solar).
- [ ] Empty state when no actions exist.

**Verification:**
- [ ] `npm test`: cards render the `impactSummary` values.
- [ ] Manual check: numbers update as actions are added and removed.

**Dependencies:** Tasks 13, 25
**Files likely touched:** `web/components/ImpactPanel.tsx`, `web/components/BottomPanel.tsx`

### Checkpoint G: After Tasks 25-26
- [ ] All tests pass; build succeeds; impact numbers match the map

---

## Phase 7: Stretch

### Task 27: Suitability hint [STRETCH, M]
- [ ] For the selected building, a short hint ("Large flat roof in a hot hex: green roof or solar") from roof area and base heat; optional canopy % per hex from the Canopy Change Assessment.
- [ ] `npm test`: hint rules on fixtures.

### Task 28: Shareable scenario URL [STRETCH, S]
- [ ] Actions serialise to a compact URL hash and load from it; invalid hashes are ignored safely (validated, never `eval`-ed).
- [ ] `npm test`: round-trip; malformed input rejected.

### Task 29: Free-form area drawing [STRETCH, M]
- [ ] Polygon draw tool; cells whose centers fall inside become the area selection.
- [ ] `npm test`: polygon → cells.

---

## Phase 8: Polish and deploy

### Task 30: Loading, empty, error states and accessibility [MVP, M]
- [ ] Loading state for hexes; error with retry; all buttons keyboard operable with visible focus and `aria-label`s; the Act panel announces applied actions (`aria-live`).
- [ ] Verify: Tab through the page; block `/api/hexes` and see the error UI; `npm run lint`.

### Task 31: Playwright smoke test [MVP, S]
- [ ] Load page → select a building (test hook) → apply green roof → tooltip/impact shows a cooler value → reset restores it. Skips with a clear message when no Mapbox token is set.
- [ ] Verify: `npx playwright test` passes locally.

### Task 32: Deploy to Vercel [MVP, S]
- [ ] Deployed from `web/`; `NEXT_PUBLIC_MAPBOX_TOKEN` set in project settings; token URL-restricted to localhost and the production domain (ask before changing account settings).
- [ ] Verify: production URL in a private window runs the core loop.

### Task 33: README and backup demo video [MVP, XS]
- [ ] README: what it is, data sources, cooling model and its limits, how to run pipeline and web.
- [ ] 60–90 s recording: select building → green roof → map cools → area → trees → impact panel.

### Checkpoint Final
- [ ] All tests pass; deployed demo runs the core loop end-to-end
- [ ] Backup video recorded
