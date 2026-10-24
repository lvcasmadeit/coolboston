---
inclusion: always
---

# Architecture

CoolBoston shows where Boston's urban heat is. The user selects a building or an area, applies a cooling action, and sees the estimated change. Product definition: `PLAN.md`. Architecture decisions and the input table: `tasks/plan.md`.

Status as of 2026-10-24: the data pipeline and the heat layer are built. Selection, the impact model, the action panels and the charts are not. See Status below.

## Data flow

```
Pipeline (Python, run by hand)
  Boston boundary ──> H3 res-10 grid                         grid.py
  Heat Watch 3pm hexes ──> area-weighted join onto grid      heatwatch.py, join.py
  Landsat summer 2019 (STAC) ──> DN to °C, QA mask           landsat.py, lst.py
                              ──> per-pixel median           composite.py
                              ──> per-cell mean              zonal.py, run_landsat.py
                              ──> pipeline/cache/surface_2019.json
  build_hexes.py  (joins air + surface by cell)
        │
        ▼
  web/data/hexes.json  (schema v3)

Web app (Next.js, no backend)
  app/api/hexes/route.ts   static import, validated at build, served as GET /api/hexes
        │
        ▼
  useHexes() ──> MapView (react-map-gl/mapbox, Mapbox Standard)
                   ├─ DeckOverlay (interleaved) ──> createHeatLayer (18 m slab)
                   ├─ Legend, navigation and scale controls
                   └─ error alert
  app/page.tsx: TopBar | map | RightPanel (Act, Layers, Method) | BottomPanel (Impact)
```

## Pipeline

Run `run_landsat` once (needs network), then `build_hexes` (reads the cache).

| Step | Module | Behaviour |
|---|---|---|
| Grid | `grid.py` | Fetches the boundary (cached). Returns sorted unique H3 res-10 cells whose centres fall inside. About 8,044 cells. |
| Air | `heatwatch.py`, `join.py` | Heat Watch 3pm hexes: 682 hexes of about 25 ha. Zeros become NaN. `area_weighted_mean` reprojects to EPSG:5070 and averages by overlap area. |
| Surface search | `landsat.py` | STAC search, 1 June to 31 August 2019, cloud cover below 20%. Landsat 7 thermal asset `lwir`; Landsat 8 and 9 `lwir11`. Hrefs signed with a SAS token. |
| Surface pixels | `lst.py` | DN to °C: `DN × 0.00341802 + 149.0 − 273.15`. DN 0 becomes NaN. QA_PIXEL mask covers fill, dilated cloud, cirrus, cloud and shadow. |
| Composite | `composite.py` | Per-pixel nan-median across scenes. Fails if fewer than 2 usable scenes. |
| Zonal | `zonal.py` | Assigns each 30 m pixel centre (EPSG:32619) to its H3 cell and averages the valid pixels. |
| Runner | `run_landsat.py` | Reprojects scenes to one 30 m grid, runs the steps above, converts to °F, writes the cache. |
| Output | `build_hexes.py` | Joins air and surface by cell, rounds to 2 decimals, writes `web/data/hexes.json`. |

Last recorded run (Task 17): 9 usable scenes. 8,042 of 8,044 cells have a surface value.

## Data contract (`hexes.json`, schema v3)

```json
{"version":3,"hexes":[{"id":"8a…","temp3pm":91.99,"surface":101.23}]}
```

- `id`: H3 res-10 cell index.
- `temp3pm`: 2019 Heat Watch mean 3pm air temperature, °F, or `null`.
- `surface`: summer 2019 Landsat median surface temperature, °F, mid-morning, or `null`.

Change rules are in `conventions.md`.

## Web app

Shell and layout
- `app/page.tsx` is the grid shell. `TopBar` sits across the top. `MapClient` fills the main area. `RightPanel` has three tabs (Act, Layers, Method), all placeholders now. `BottomPanel` is the Impact area, also a placeholder.
- `app/layout.tsx` sets `lang="en"`, the Geist fonts and the metadata.

Map
- `components/MapClient.tsx` runs `checkMapboxToken` and shows a message if the token is missing or not `pk.`. It loads `MapView` with `ssr: false`.
- `components/MapView.tsx` renders the Mapbox map with `MAP_STYLE`, `BOSTON_VIEW` and `BASEMAP_CONFIG` from `lib/mapConfig.ts`. It loads hexes with `useHexes`, takes the 3pm range with `valueRange`, and adds the heat layer when visible. It also renders the legend and the error alert.
- `components/DeckOverlay.tsx` attaches one interleaved `MapboxOverlay` per map instance.
- `components/layers/HeatLayer.ts`: `createHeatLayer` builds an extruded `H3HexagonLayer` at 18 m (`SLAB_HEIGHT_M`) in the `middle` slot. Colour comes from `heatColor`. The tooltip shows the 3pm value.
- `components/Legend.tsx`: the air-temperature legend.

Data
- `components/useHexes.ts` fetches `/api/hexes` once per mount, validates with `parseHexes`, and returns `loading`, `error` or `ready`.
- `lib/data.ts` holds the validator. `lib/types.ts` holds the contract types.
- `lib/heat.ts`: `valueRange`, `formatTemp`. `lib/colors.ts`: `HEAT_RAMP`, `heatColor`, `rampCss`.

State
- `lib/store.ts` is a Zustand store. It holds `selection` (a building, an area or null), `actions` (applied, ordered, with undo), `viewMode` (`heat` or `change`) and `layers` (visibility and opacity). Session only. Nothing is persisted.

Domain model (`lib/types.ts`)
- `BUILDING_INTERVENTIONS`: green-roof, cool-roof, solar.
- `AREA_INTERVENTIONS`: trees, cool-pavement, depave.
- An `Action` pairs one intervention with a target: a `SelectedBuilding` or a list of res-10 cells.
- Roof rule: one roof action per building.

Intervention catalog (`lib/interventions.ts`, not yet committed)
- The single home for costs, effects, energy figures and sources. `CATALOG` maps intervention IDs to specs. `buildingActions()` and `areaActions()` list them for the UI.
- Known mismatch: the `CATALOG` keys (solar, green-roof, cool-building, green-walls, green-roof-solar, street-trees) do not match the IDs in `types.ts` (green-roof, cool-roof, solar, trees, cool-pavement, depave). Reconcile them before typecheck passes.

## Impact model (planned, Tasks 24–26)

Share-based and per hex:
- Share `s` = treated area ÷ hex area, capped at 1. Effects stay in the treated hex. Several actions in one hex add together. No spread to neighbours.
- Air: cool roof −0.61 °C per +0.1 albedo × an assumed +0.3 albedo. Green roof −5 °F, a citywide upper-bound proxy. Street trees −0.07 °C per +0.1 canopy × 0.10.
- Surface at s = 1: cool roof −55 °F; green roof −56 °F.
- Heat-island metric: `H = T − citywide mean`, with a fixed baseline. Change = `(H_before − H_after) ÷ H_before × 100`, reported as n/a when `H_before ≤ 0.5 °F`.
- Colour scales are fixed to the baseline. Change mode uses its own scale.

## Status

- Done: Phase 0 (scaffold, 3D map, deck.gl overlay); Phase 1 (grid, Heat Watch join, hexes contract, heat layer); Phase 2 (pivot cleanup); Phase 3 (inputs, Landsat search, DN conversion, composite, surface field in hexes v3).
- In progress: Task 19, the intervention catalog (`lib/interventions.ts`, uncommitted).
- Not started: geometry helpers; building selection (the Mapbox buildings featureset spike, Task 21); area selection; the impact model; the Act and Layers panels; metric cards; charts; shareable URL; Playwright test; Vercel deploy.

## Decisions to keep

- No backend, no accounts, no server-side state.
- The pipeline runs offline. Its output, `web/data/hexes.json`, is committed. Raw downloads and the Landsat cache are not.
- Surface values are mid-morning and labelled as such everywhere.
- Every figure is an estimate. A figure with no source reads "not quantified".
- The basemap is Mapbox Standard with 3D facades off (their tiles 404 for downtown Boston). Data-driven building colours need our own building tileset (`planui.md` 3.4).

## Known limits

- Heat Watch covers 682 hexes of about 25 ha. Res-10 cells (about 1.5 ha) repeat those values, so the air layer is no finer than its source.
- Surface is one summer 2019 composite, mid-morning.
- Mapbox buildings: footprints and heights are unverified until the Task 21 spike.
