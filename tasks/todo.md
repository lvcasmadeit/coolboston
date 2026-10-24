# Task List: CoolBoston

Overview, architecture, inputs and risks: `plan.md`. Product definition: `../PLAN.md`. Completed tasks are listed compactly; full acceptance criteria are in git history.

Conventions
- Web commands run in `web/`: tests `npm test`, types `npm run typecheck`, lint `npm run lint`, build `npm run build`.
- Pipeline commands run in `pipeline/`: tests `uv run pytest`, build data `uv run python -m coolboston.build_hexes`.
- Tier: **MVP** = must ship, **STRETCH** = cut if behind.
- Scope: XS = 1 file, S = 1–2, M = 3–5, L = more than 5 (split any L).
- Every task ends with a working app or pipeline. Do not start a task on a red build.
- Every task ends with a commit of its own. Pushes happen only when asked.

---

## Done

### Phase 0: Foundation
- [x] Task 1: Repo scaffold (8e761d6)
- [x] Task 2: Next.js app and tooling (88b37f1)
- [x] Task 3: Zustand store (1099ba8). Superseded by Task 12.
- [x] Task 4: Layout shell (c8f802d). Superseded by Task 13.
- [x] Task 5: 3D Mapbox map, client-only (4430e89)
- [x] Task 6: deck.gl interleaved overlay (ad000d1)

Checkpoint A passed.

### Phase 1: Heat hexes
- [x] Task 7: Pipeline scaffold, boundary, H3 grid (634f33e)
- [x] Task 8: Heat Watch ingest and area-weighted join (9b15a30)
- [x] Task 9: hexes.json writer and /api/hexes (81753c6)
- [x] Task 10: Heat hex layer, ramp, tooltip (52bc29d)

Checkpoint B passed.

### UI and map revamp (`../planui.md`)
- [x] Light theme, Mapbox Standard, 50% opacity (79329c4, 453056e, 7d9441b, 3810aeb, bf67645, 36ef80a)
- [x] Map look v2: res 10, 18 m slab, rainbow ramp, navy water, camera (1d9d577, dc71c7c, 6e5ec2d, ff9fa00, 453f156)

### Phase 2: Pivot cleanup
- [x] Task 11: Rewrite PLAN.md for the select-and-act direction (7637b56)
- [x] Task 12: Store holds selection, actions, view mode; timeline state removed (1bb22d4)
- [x] Task 13: Act / Layers / Method tabs, Impact panel; intervention dropdown and Recharts removed (99cf042)
- [x] Task 13b: hexes.json v2 is 3pm only (cc608cd)

Checkpoint C passed (46 web tests, 13 pipeline tests, typecheck, lint, build, 1280×720 and 1440×900 layouts checked).

---

## Phase 3: Inputs and surface data

### Task 14: Source the remaining inputs [MVP, XS] (done)
**Description:** Fill the open rows of the inputs table in `plan.md`: energy per m² for green roof, cool roof and green walls; street-tree planting cost per m²; current commercial rooftop solar cost in Massachusetts; usable roof share and panel kW per m²; commercial electricity rate; Boston PV yield (optional). Use primary or high-trust sources. Record any input with no source as "not quantified".

**Acceptance criteria:**
- [x] Every open row has a value (low / central / high with unit and year), a source URL, and a confidence, or "not quantified".
- [x] Only `tasks/plan.md` changes.

**Verification:**
- [x] Manual check: every row has a source URL or "not quantified".

**Dependencies:** None
**Files likely touched:** `tasks/plan.md`

### Task 15: Landsat 2019 search and asset check [MVP, S] (done)
**Description:** `search_scenes(year)` queries Planetary Computer STAC (`landsat-c2-l2`) for Boston's bounding box, June 1 to August 31, 2019, cloud cover below 20%, and returns signed hrefs. Confirm the thermal and QA asset keys for Landsat 7 and Landsat 8 items.

**Acceptance criteria:**
- [x] Query builder (bbox, dates, cloud filter) is a pure function and is tested without network.
- [x] Asset keys are constants; the Landsat 8 thermal key is confirmed (`lwir11` expected; `lwir` seen on Landsat 7).
- [x] A code comment records the overpass (about 10:12 a.m. local solar time) and says the surface values are mid-morning.

**Verification:**
- [x] `uv run pytest`: query builder tests pass.
- [x] Manual check: a live search prints the scene count (9 under 20% cloud: 1 Landsat 8, 8 Landsat 7; acquired 15:13–15:27 UTC).

**Dependencies:** Task 7
**Files likely touched:** `pipeline/src/coolboston/landsat.py`, `pipeline/tests/test_landsat_query.py`

### Task 16: Landsat DN conversion and QA mask [MVP, S] (done)
**Description:** Pure functions that turn Landsat thermal digital numbers into °C and mask invalid pixels.

**Acceptance criteria:**
- [x] `dn_to_celsius(dn) = dn × 0.00341802 + 149.0 − 273.15`; DN 0 becomes NaN.
- [x] `cloud_mask(qa)` flags fill, dilated cloud, cirrus, cloud and cloud shadow using QA_PIXEL bit positions from the Landsat Collection 2 documentation (cited in a comment). Masked pixels become NaN.

**Verification:**
- [x] `uv run pytest`: DN 44000 gives about 26.24 °C; a synthetic QA array with known bits masks exactly those pixels.

**Dependencies:** Task 15
**Files likely touched:** `pipeline/src/coolboston/lst.py`, `pipeline/tests/test_lst.py`

### Task 17: Summer 2019 composite and per-hex mean [MVP, M] (done)
**Description:** Stack the masked scenes from Tasks 15–16, take the per-pixel nan-median, clip to Boston, and compute the mean of valid pixels per H3 res-10 cell. Output goes to `pipeline/cache/` (gitignored). Runs fail loudly if fewer than two usable scenes exist.

**Acceptance criteria:**
- [x] Nan-median composite matches fixture values; NaN pixels are ignored.
- [x] Per-hex mean uses only valid pixels; a cell with none is null.
- [x] Fewer than two usable scenes raises an error that names the year.
- [x] Output is written to `pipeline/cache/`, never to `web/`.

**Verification:**
- [x] `uv run pytest`: composite, zonal mean and failure-mode fixtures pass.
- [x] Manual check: the run prints how many of the 7,908 air-data cells have a surface value. Result: 9 usable scenes; 7,906 of 7,908 air cells (8,042 of 8,044 overall) have a surface value; median 95.2 °F, 5th–95th percentile 77.7–105.2 °F; correlation with 3pm air 0.57; 18 cells below 70 °F, mostly at the waterfront.

**Dependencies:** Tasks 7, 15, 16
**Files likely touched:** `pipeline/src/coolboston/composite.py`, `pipeline/src/coolboston/zonal.py`, `pipeline/src/coolboston/run_landsat.py`, `pipeline/tests/test_composite.py`, `pipeline/tests/test_zonal.py`

### Task 18: Surface field in hexes.json v3 [MVP, M] (done)
**Description:** Add `surface` (°F, 2 decimals, null allowed) to the hex contract. Bump the schema to version 3 on both sides.

**Acceptance criteria:**
- [x] `build_hexes.py` writes `surface` in °F, rounded to 2 decimals, `allow_nan=False`; schema version is 3.
- [x] `Hex` type and `parseHexes` include `surface`; a v2 file is rejected with a clear error.
- [x] `web/data/hexes.json` is regenerated.

**Verification:**
- [x] `uv run pytest`: writer tests pass with the new field.
- [x] `npm test`: loader accepts v3 and rejects v2.
- [x] Manual check: `curl localhost:3000/api/hexes` returns `"version":3` with `surface` values.

**Dependencies:** Task 17
**Files likely touched:** `pipeline/src/coolboston/build_hexes.py`, `pipeline/tests/test_build_hexes.py`, `web/lib/types.ts`, `web/lib/data.ts`, `web/lib/data.test.ts`, `web/data/hexes.json`

---

## Phase 4: Selection

### Task 19: Intervention catalog [MVP, S] (done)
**Description:** One module with every action: where it applies, its cost range, cooling coefficients, energy basis, surface change and its source. This is the only place these numbers live.

**Acceptance criteria:**
- [x] Building actions: solar, green roof, cool building, green walls. Combined: green roof + solar (one roof action). Area: street trees. Cool pavement and depave are absent.
- [x] Each entry has `id`, `label`, `appliesTo`, `costPerUnit {low, central, high, unit}`, `airCoefficient`, `surfaceChange`, `energy` (value, or "not quantified", or the solar inputs), `source` (citation with URL) and `note`.
- [x] Every value comes from Task 14 or is an explicitly labelled assumption (roof albedo change 0.3).
- [x] low ≤ central ≤ high throughout.

**Verification:**
- [x] `npm test`: every action has a source; ranges are ordered; the combined action is green roof + solar; building and area sets are disjoint.

Note: `costPerUnit` is a list of cost lines so the combined action can carry both its parts' units ($/m² roof and $/W). `roofAction` and `parts` support the roof rule. `surfaceChange` for street trees is null (not quantified).

**Dependencies:** Task 14
**Files likely touched:** `web/lib/interventions.ts`, `web/lib/interventions.test.ts`, `web/lib/types.ts`

### Task 20: Geometry helpers [MVP, S] (done)
**Description:** Footprint area, the res-10 cell of a building's centroid, and the hex area. Adds `h3-js` as a direct dependency, pinned to 4.5.0 (the version deck.gl resolves).

**Acceptance criteria:**
- [x] `footprintAreaM2` on a ~100 m × 100 m square near Boston is within 1% of 10,000 m²; a hole subtracts its area.
- [x] `buildingCell` returns a valid res-10 cell.
- [x] `HEX_AREA_M2` comes from h3 (about 15,050 m²), not a literal.

**Verification:**
- [x] `npm test` passes.

Note: `HEX_AREA_M2` is the h3 average (15,047 m²). A downtown Boston cell measures 15,496 m² (`cellArea`), about 3% larger; Task 24 can use per-cell area if that matters.

**Dependencies:** None
**Files likely touched:** `web/lib/geo.ts`, `web/lib/geo.test.ts`, `web/package.json`

### Task 21: Building selection spike (Mapbox featureset) [MVP, S] (done)
**Description:** Confirm that Standard's `buildings` featureset gives a stable id, footprint and height, and that footprints are whole rather than cut at tile edges. Decide Mapbox or the fallback.

**Acceptance criteria:**
- [x] A click handler on `{ featuresetId: "buildings", importId: "basemap" }` logs id, properties and geometry type for five buildings, including one tall tower and one on a tile edge.
- [x] `plan.md` records the decision: Mapbox kept, or the downtown footprint fallback chosen, with the reason.
- [x] Debug code is removed or clearly marked as a spike.

**Verification:**
- [x] Manual check with a temporary Playwright script, deleted afterwards.

**Dependencies:** Task 20
**Files likely touched:** `web/components/MapView.tsx`, `tasks/plan.md`

### Task 22: Building selection and highlight [MVP, M] (done)
**Description:** Click a building to select it, with a feature-state highlight.

**Acceptance criteria:**
- [x] A click sets `selection = { kind: "building", building: { id, footprint, heightM, roofAreaM2, cell } }`. A missing height is null, not zero.
- [x] The selected building is highlighted (feature state `select`, sage). Clicking another moves it; Escape or empty ground clears it.
- [x] A building click takes priority over a hex click. The hex hover tooltip still works.

**Verification:**
- [x] `npm test`: feature-to-building mapping, including a missing height.
- [x] Manual check: select, reselect, Escape; no console errors.

Notes: implemented in `components/BuildingSelection.tsx` with `map.addInteraction` (building click returns true so the ground handler does not fire) and a store subscription that keeps feature state in sync. Highlight colour is `colorBuildingSelect: #4F7A5A`. Verified in the browser: select a 210 m tower, reselect a low-rise, empty ground clears, Escape clears, hex tooltip still works, no console errors. Known limitation: towers drawn as Standard 3D models (glassy landmark towers) get the `select` state but do not change colour; extruded buildings do. There is no hex click yet (Task 23), so the priority rule is trivially met.

**Dependencies:** Tasks 12, 21
**Files likely touched:** `web/components/MapView.tsx`, `web/lib/buildings.ts`, `web/lib/buildings.test.ts`

### Task 23: Area selection on hexes [MVP, M] (done)
**Description:** An area tool: click a hex to select it, shift-click to add or remove, shift-drag a box to add every hex whose centre is inside the box. Plain drag still pans.

**Acceptance criteria:**
- [x] Click, shift-click and box selection work with the area tool on; plain drag pans.
- [x] Selected cells draw with a sage outline above the slab.
- [x] Selecting an area clears a building selection and vice versa; Escape clears.

**Verification:**
- [x] `npm test`: box to cells (projection mocked) and toggle logic.
- [x] Manual check: box-select a few blocks in Chinatown.

Notes: a Building / Area toggle floats over the map (store `tool`). In area mode, clicks pick the heat hex through deck (`pickObject`), so a pitched view selects the hex under the cursor rather than the ground point; Mapbox box-zoom is off while the tool is on. Browser check: click, shift-click add and remove, shift-drag box near Chinatown, plain drag pans and keeps the selection, building and area selections replace each other, Escape clears, tooltip still works, no console errors. Limitation: with the heat layer hidden, hexes cannot be clicked (box select still works).

**Dependencies:** Task 12
**Files likely touched:** `web/components/layers/SelectionLayer.ts`, `web/lib/areaSelect.ts`, `web/lib/areaSelect.test.ts`, `web/components/MapView.tsx`

### Checkpoint D: After Tasks 14–23
- [x] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` pass
- [x] Building and area selection each work and clear
- [x] Spike decision recorded in `plan.md`
- Result: 86 web tests, 30 pipeline tests, typecheck, lint and build pass; selection checked in headless Chromium with no console errors.
- [ ] Review with human before proceeding

---

## Phase 5: Impact model and map

### Task 24: Hex impact model [MVP, M] (done)
**Description:** A pure function from the action list to per-hex air ΔT and surface ΔT. Share-based, no spread, additive within a hex, total share capped at 1. Formulas are in `plan.md` and cited in code comments.

**Acceptance criteria:**
- [x] With no actions, every delta is zero.
- [x] One 1,000 m² cool-building roof gives about −0.22 °F air in its hex (±0.01).
- [x] A fully selected hex with street trees gives −0.07 °C (−0.13 °F) air.
- [x] Two actions in one hex add; total share is capped at 1; neighbouring hexes are unchanged.
- [x] Null base temperatures stay null. Solar and green walls give zero air and surface change.
- [x] 50 actions across 8,044 hexes run in under 20 ms.

**Verification:**
- [x] `npm test` covers each case above.

Notes: `lib/cooling.ts` exports `computeDeltas(actions)` (sparse map of touched hexes) and `applyDeltas(hexes, deltas)`. Actions with no effect (solar, green walls) take no share, so they do not dilute a hex's cap. Street trees' unquantified surface effect counts as 0. Hex area is the h3 average.

**Dependencies:** Tasks 19, 20
**Files likely touched:** `web/lib/cooling.ts`, `web/lib/cooling.test.ts`

### Task 25: Heat-island, energy and cost metrics [MVP, M] (done)
**Description:** Baseline citywide mean over valid hexes, heat-island °F and percentage change, energy offset, and capital cost range for each action and for the total.

**Acceptance criteria:**
- [x] Baseline mean is computed once from valid hexes (7,908 cells) and is fixed while actions change.
- [x] `H = T − mean`. The percentage is `(H_before − H_after) ÷ H_before × 100`, and n/a when `H_before ≤ 0.5 °F`. A 2.0 → 1.9 °F example gives 5%.
- [x] Solar energy = usable area × kW per m² × yield (Task 14 inputs), shown as a range. Dollar values use the electricity rate. "Not quantified" passes through as text.
- [x] Capital cost = quantity × unit cost range. The combined action's cost is the sum of its parts.

**Verification:**
- [x] `npm test`: the examples above, plus the n/a boundary at exactly 0.5 °F.

Notes: `lib/impact.ts`. Ranges combine low×low, central×central, high×high. Solar usable share follows Gagnon's size classes (small < 5,000 ft², large > 25,000 ft²). Roof kWh savings are valued at the commercial rate. Green walls need a wall area, so I added an explicit assumption (catalog `GREEN_WALL_COVER_HEIGHT_M = 10`): the lowest 10 m of the outer facade, from a new `footprintPerimeterM`; unknown height gives "not quantified". Baseline covers both air and surface means.

**Dependencies:** Tasks 14, 18, 19, 24
**Files likely touched:** `web/lib/impact.ts`, `web/lib/impact.test.ts`

### Task 26: Air / Surface base layer and Change mode [MVP, M] (done)
**Description:** The map shows either air or surface temperature as its base, each on a fixed baseline colour ramp. Change mode colours affected hexes by their % reduction on its own scale, and fades the rest.

**Acceptance criteria:**
- [x] Store gains `metric: "air" | "surface"`, default `air`. `viewMode` already exists.
- [x] Air uses the baseline air range; surface uses its own baseline range. Neither changes after actions.
- [x] Change mode colours affected hexes by % reduction on a 0 → max scale. Unaffected and n/a hexes are faded.
- [x] Layers update through `updateTriggers`; the map is never recreated.

**Verification:**
- [x] `npm test`: domains stay fixed after actions; Change colours; n/a hexes fade.
- [x] Manual check through the test hook: a green roof is visible in Change mode.

Notes: one layer (`heat-hexes`) serves both modes through `lib/heatView.ts`, so area picking keeps working; no separate ChangeLayer file. Base data stays the same array; actions, metric, mode and opacity reach deck only through `updateTriggers`. Air range is min–max; surface range is the 2nd–98th percentile (74.8–108.2 °F) because the raw extremes (46.5–130.7 °F) wash the ramp out. Change ramp is pale-to-deep blue, unaffected and n/a hexes are grey at a quarter of the slab alpha. Legend and tooltip follow the metric and mode; the surface legend says mid-morning. Test hook: `window.__coolboston.store` outside production, or with `NEXT_PUBLIC_TEST_HOOK=1` (`lib/testHook.ts`). Browser check: green roof on a 1,267 m² roof cools its hex 92.3 → 91.8 °F, heat island −36.1%; Change mode shows that hex deep blue and the rest grey; a cool roof in a hot-surface hex shows in Change/surface (30.4%); undo restores the original colour; one map canvas throughout; no console errors.

**Dependencies:** Tasks 18, 24, 25
**Files likely touched:** `web/components/layers/HeatLayer.ts`, `web/components/layers/ChangeLayer.ts`, `web/lib/colors.ts`, `web/lib/store.ts`, `web/components/MapView.tsx`

### Checkpoint E: After Tasks 24–26
- [x] Tests and build pass
- [x] An action added through the test hook cools its hex on the map
- [ ] Review with human: are the effect sizes readable? Does Change mode need more work?

---

## Phase 6: Act panel and layout

### Task 27: Act panel [MVP, M] (done)
**Description:** Selection details and action buttons, each with its cost range and effect, as in the agreed layout.

**Acceptance criteria:**
- [x] Building selected: roof area, height and hex base temperature. Buttons for solar, green roof, cool building, green walls, and green roof + solar. Each shows its cost range, with "not quantified" where applicable.
- [x] Area selected: cell count and acres. A street-trees button states its canopy effect.
- [x] Nothing selected: instructions.
- [x] One roof action per building: other roof buttons are disabled with the reason. Green walls stay available with any roof action. The combined option counts as one roof action.

**Verification:**
- [x] `npm test`: available actions per selection kind and the roof rule.
- [x] Manual check: apply, then try a second roof action on the same building.

Notes: `components/ActPanel.tsx`, `lib/availableActions.ts`, `lib/format.ts`. Each button shows its capital cost range and its air effect at the hex. A second application of the same action is also disabled ("Already applied."). Browser check: a 129 m² roof shows all five actions; after green roof, the other roof actions are disabled with the reason and green walls stays enabled; an area shows street trees (−0.13 °F per hex). Green walls price at $380k–$1.1M on that small building: the sourced cost ($95–265/ft², mostly indoor systems) over the lowest 8 m of the facade.

**Dependencies:** Tasks 19, 22, 23, 24, 25
**Files likely touched:** `web/components/ActPanel.tsx`, `web/components/RightPanel.tsx`, `web/lib/availableActions.ts`, `web/lib/availableActions.test.ts`

### Task 28: Applied actions list [MVP, S] (done)
**Description:** A list of applied actions with remove, undo and reset.

**Acceptance criteria:**
- [x] Each item shows intervention, target and cost range.
- [x] Remove deletes one action; Undo removes the most recent; Reset clears all.
- [x] Clicking an item flies the map to its target.

**Verification:**
- [x] `npm test`: the list is derived from the store; remove, undo and reset update it.
- [x] Manual check: the list matches the map.

Notes: `components/ActionList.tsx` (newest first, with total capital), `lib/actionList.ts`, `components/MapFocus.tsx`. Fly-to goes through a store `focus` request so the list does not need the map. The list shows in the Act tab with or without a selection. Browser check: three actions listed with costs; remove, undo and reset update the list and the map; reset restores the hex colour; clicking an item flies to it at zoom 16.

**Dependencies:** Task 27
**Files likely touched:** `web/components/ActionList.tsx`, `web/components/ActPanel.tsx`

### Task 29: Treated roof markers [MVP, S] (done)
**Description:** A deck.gl layer that caps each treated roof at its building height, coloured by intervention. Kept from the earlier plan.

**Acceptance criteria:**
- [x] Markers appear only for building actions and are removed with their action.
- [x] Each intervention has a distinct colour.

**Verification:**
- [x] `npm test`: marker data derived from actions (colour, elevation).
- [x] Manual check: a tilted view shows the capped roof.

Notes: `components/layers/RoofLayer.ts`, a flat `PolygonLayer` 0.4 m above the roof in the `middle` slot. Green walls draw as a thick outline; cool roofs are light blue because white would disappear on Standard's white roofs. Buildings with unknown height sit at ground level. Browser check: in a pitched view (zoom 16.5, pitch 60) the green-roof cap sits on its roof and is hidden behind nearer buildings; the layer goes away when the last building action is removed. Known limitation: looking straight down at zoom 18+, Standard's roof covers most of the cap (a 2 m offset did not help; 60 m or `depthCompare: always` does, but then caps show through towers). The demo view is pitched, so this is accepted.

**Dependencies:** Tasks 22, 28
**Files likely touched:** `web/components/layers/RoofLayer.ts`, `web/components/MapView.tsx`

### Task 30: Metric cards [MVP, M] (done)
**Description:** Right-panel cards for current conditions and for each change, labelled as building-level or hex-level.

**Acceptance criteria:**
- [x] Current conditions: air temperature (3pm, July 2019); surface temperature (summer 2019, mid-morning, hex average); heat island as °F above the citywide mean.
- [x] After an action: air change, surface change, heat-island % change, energy offset (kWh/yr and $/yr, as ranges) or "not quantified", capital cost range, and roof surface change for building actions, labelled peak-summer.
- [x] Every number carries an estimate label. Air and heat-island values for a building are shown at hex level.

**Verification:**
- [x] `npm test`: cards match `impact.ts` output for a fixture.
- [x] Manual check: a green roof shows every card.

Notes: `lib/metrics.ts` (`selectionMetrics`) and `components/MetricCards.tsx`, shown in the Act tab under the selection details. Temperatures count every action in the hex (including other buildings'); energy and cost cover only this selection's actions. Areas use the mean over selected hexes with data. The change section is an `aria-live` region. Browser check: green roof + solar on a 2,606 m² roof shows air −0.87 °F, surface −9.7 °F, heat island −81.1%, roof surface −56 °F peak summer, 244k–323k kWh/yr ($61k–$82k/yr), capital $781k–$1.8M.

**Dependencies:** Tasks 25, 27
**Files likely touched:** `web/components/MetricCards.tsx`, `web/components/RightPanel.tsx`

### Task 31: Layers tab and top-bar view controls [MVP, M] (done)
**Description:** A Layers tab with toggles and opacity sliders, as in the screenshot, plus the view controls in the top bar.

**Acceptance criteria:**
- [x] Toggles for the heat base layer, roof markers and buildings. Opacity sliders update the layer opacity.
- [x] Top bar: Air / Surface and Heat / Change controls, labelled and keyboard operable.
- [x] Layer state comes from the store; no other component reads it directly.

**Verification:**
- [x] `npm test`: store opacity and toggle changes reach the layer props.
- [x] Manual check: each control updates the map.

Notes: `lib/layers.ts` (registry), `components/layers/buildLayers.ts` (store → deck layers, unit tested), `components/LayersPanel.tsx`, `components/ViewControls.tsx`, `components/BasemapBuildings.tsx` (`show3dBuildings` config), shared `components/ui/segmented.tsx`. 3D buildings has a toggle only: Standard does not expose building opacity. The slider's `aria-label` is forwarded to its thumb (role `slider`). Verified by `e2e/layers.spec.ts`: keyboard Enter/Space on the view controls, legend text per metric and mode, heat opacity 50% → 30% by arrow keys reaches the fill alpha, roof and heat toggles add and remove deck layers, 3D buildings toggles the basemap config.

**Dependencies:** Tasks 26, 29
**Files likely touched:** `web/components/LayersPanel.tsx`, `web/components/TopBar.tsx`, `web/lib/layers.ts`, `web/lib/layers.test.ts`


### Checkpoint F: Core loop complete
- [x] Select a building, apply green roof, see the map and metrics change, remove it, see it restore (`e2e/act.spec.ts`)
- [x] The same loop works for an area with street trees (`e2e/act.spec.ts`)
- [ ] Deploy the current build (Task 37) so the URL is known — deferred by request (2026-10-24); nothing deployed
- [x] Review with human before proceeding (core loop accepted; deploy held)

---

## Phase 7: Charts

### Task 32: Recharts and cost-versus-effect chart [MVP, M]
**Description:** Re-add Recharts pinned to 3.10.1, removed in Task 13. Add the bottom-panel scatter: x = capital cost (range), y = % heat-island change at the hex. Roof surface change appears in the tooltip.

**Acceptance criteria:**
- [ ] Recharts is pinned to the exact version in `package.json`.
- [ ] One point per action for the current selection; the empty state shows when nothing is applied.
- [ ] The tooltip shows the roof surface change and cost range.

**Verification:**
- [ ] `npm test`: the data transform from impact outputs.
- [ ] `npm run build` passes.
- [ ] Manual check: the chart matches the cards.

**Dependencies:** Tasks 25, 30
**Files likely touched:** `web/package.json`, `web/components/charts/TradeoffChart.tsx`, `web/components/BottomPanel.tsx`, `web/lib/tradeoff.ts`, `web/lib/tradeoff.test.ts`

### Task 33: Before-and-after chart [MVP, S]
**Description:** Bars for air, surface and heat island (°F), before and after, for the current selection.

**Acceptance criteria:**
- [ ] Bars update as actions are added and removed.
- [ ] Empty state when no action is applied.

**Verification:**
- [ ] `npm test`: the transform.
- [ ] Manual check: a green roof moves the bars.

**Dependencies:** Task 32
**Files likely touched:** `web/components/charts/BeforeAfterChart.tsx`, `web/components/BottomPanel.tsx`

### Checkpoint G: Charts
- [ ] Both charts update with actions and show an empty state with none
- [ ] Review with human before proceeding

---

## Phase 8: Stretch

### Task 34: Shareable scenario URL [STRETCH, S]
**Description:** Encode the action list in the URL hash, and load it back. Malformed input is rejected and never evaluated.

**Acceptance criteria:**
- [ ] Round trip: encode, then decode, gives the same actions.
- [ ] Malformed or unknown ids are ignored with no error shown to the user.

**Verification:**
- [ ] `npm test`: round trip and malformed inputs.

**Dependencies:** Task 28
**Files likely touched:** `web/lib/shareUrl.ts`, `web/lib/shareUrl.test.ts`

---

## Phase 9: Polish and deploy

### Task 35: Loading, error states and accessibility [MVP, M]
**Description:** Loading and error states, keyboard access, labels, and estimate labels everywhere.

**Acceptance criteria:**
- [ ] Skeleton while `hexes.json` loads; error with retry if the API fails.
- [ ] Every button, slider and toggle is keyboard operable with a visible focus ring and an `aria-label`.
- [ ] Applied-action announcements use an `aria-live` region.
- [ ] Every estimate has an estimate label; every surface value has the mid-morning label.

**Verification:**
- [ ] Manual check: Tab through the page; block `/api/hexes` and see the error state.
- [ ] `npm run lint` passes.

**Dependencies:** Checkpoint F
**Files likely touched:** `web/components/*`, `web/hooks/useHexes.ts`

### Task 36: Playwright smoke test [MVP, S] (harness and specs in place: `e2e/`, `npm run e2e`; token skip done)
**Description:** One end-to-end test of the core loop.

**Acceptance criteria:**
- [ ] Load the page, select a building (test hook), apply green roof, see a heat-island % change, remove it, see the values restore.
- [ ] Skips with a clear message when no Mapbox token is set.

**Verification:**
- [ ] `npx playwright test` passes locally.

**Dependencies:** Checkpoint F
**Files likely touched:** `web/e2e/smoke.spec.ts`, `web/playwright.config.ts`

### Task 37: Deploy to Vercel [MVP, S]
**Description:** Deploy from `web/`. The token is URL-restricted in the Mapbox dashboard. Changing account settings needs your approval.

**Acceptance criteria:**
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` is set in Vercel project settings, not in the repository.
- [ ] The token is restricted to localhost and the production domain (after your approval).
- [ ] The production URL runs the core loop.

**Verification:**
- [ ] Manual check: open the URL in a private window and run the demo path.

**Dependencies:** Checkpoint F
**Files likely touched:** `web/vercel.json` (if needed)

### Task 38: README and backup demo video [MVP, XS]
**Description:** A README that covers what the app is, its data, the impact model and its limits, and what is not quantified. Plus a 60–90 second recording.

**Acceptance criteria:**
- [ ] README: data sources, impact model formulas, cost and energy sources, the "not quantified" rule, surface timing, and how to run the pipeline and the web app.
- [ ] Recording: select a building, apply green roof, see the map and metrics change, add street trees to an area, show the charts.

**Verification:**
- [ ] A fresh clone can run the web app from the README.

**Dependencies:** Task 37
**Files likely touched:** `README.md`

### Checkpoint Final
- [ ] All tests pass; deployed demo runs the core loop end to end
- [ ] Backup video recorded
- [ ] Every estimate labelled; every "not quantified" value shown as such
