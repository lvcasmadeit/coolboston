# Spec: square-grid

Module of `capability-map.md`. Depends on: none. Next: `heat-score`.

Status: DRAFT, awaiting human review.

## Objective

Replace the H3 res-10 hexes (~1.5 ha) with a 100 m square grid as the unit for data, the map, selection and the cooling model. Squares read more naturally under the city's street grid. They also give a defined footprint-to-cell overlap, so a building's effect lands on every tile it covers instead of on one centroid hex.

This module does not change what is shown. The Air/Surface toggle, the Heat/Change modes, heat-island % and the charts all keep working, now on tiles. The `heat-score` module replaces them.

User-visible result: the heat layer is a flat grid of 100 m squares under the 3D buildings. Building selection, the area tool, actions, metric cards and charts behave as they do today.

### Grid

- Defined in Massachusetts State Plane Mainland, EPSG:26986, in metres. The origin snaps to a multiple of 100 m. Tile `(i, j)` covers `x ∈ [100i, 100i+100)`, `y ∈ [100j, 100j+100)`.
- Tile id is `"{i}_{j}"`, which is stable and parseable. The 500 m neighbourhood (5 × 5) is `i±2, j±2`, so no geometry lookup is needed.
- Tiles are kept if they intersect the Boston land boundary (water excluded). Each tile is clipped to the boundary, and `landAreaM2` is the clipped area. Tiles with `landAreaM2 < 100` (1% of a full tile) are dropped as slivers.
- Geometry is stored as a WGS84 `[lng, lat]` ring of the clipped polygon. Unclipped tiles render as four-corner quadrilaterals, rotated about 0.3° from north because of State Plane grid convergence. That rotation is expected.
- About 12,000 tiles are expected. The exact count is recorded when the pipeline is first run.

### Inputs onto tiles

- **Air (`temp3pm`):** the area-weighted mean of the Heat Watch 3pm hexes that overlap the tile's land polygon. This reuses `join.area_weighted_mean`. There is no interpolation. Tiles within one 25 ha source hex share its value, and the Method tab says so. `null` if no sampled source overlaps.
- **Surface (`surface`):** the mean of the valid Landsat composite pixels (30 m) whose centres fall in the tile's land polygon. `null` if none.
- Missing stays `null`, never 0 (conventions.md).

### Data contract: `web/data/cells.json`, schema v4

```json
{
  "version": 4,
  "cellSizeM": 100,
  "crs": "EPSG:26986",
  "cells": [
    { "id": "2361_9015", "landAreaM2": 10000, "ring": [[-71.06, 42.35], ...], "temp3pm": 91.8, "surface": 92.0 }
  ]
}
```

- `ring` is closed (first point = last point). Coordinates are rounded to 6 decimals (about 0.1 m).
- The file replaces `hexes.json`. It is served at `GET /api/cells?v=4` (a versioned URL, as Task e9ce538 learned). `/api/hexes` is removed.
- Validated by `parseCells` in `web/lib/data.ts`, which rejects:
  - missing or unknown keys, and the wrong version;
  - non-finite numbers;
  - rings with fewer than 4 points or that aren't closed;
  - `landAreaM2` outside (0, 10000].
- The size budget is 3 MB raw. If the file is over budget, coordinate precision is reduced before considering vector tiles.

### Web behaviour

- **Heat layer:** a Mapbox GL `fill` layer from a GeoJSON source built once from `cells.json`. It sits beneath 3D buildings in the Standard style's `middle` slot. No outline (`fill-outline-color` transparent or matching fill). Colour comes from a feature-state or data-driven expression, so a view change does not rebuild the source. The deck.gl `H3HexagonLayer` slab is removed.
- **Kept in deck.gl:** the roof markers and the selection outline. The selection outline draws the selected tiles' rings or the building footprint.
- **Building → tiles:** the overlap of the building footprint with each candidate tile polygon. Candidates come from a bbox index over `cells`. Overlap is computed by convex clipping, since tiles are convex, in a local equirectangular metre frame. No new dependency.
  - `SelectedBuilding.cell` becomes `tiles: {id, overlapM2}[]`, plus `primaryTile`, the tile with the largest overlap, used for "tile air, 3pm" readouts.
  - A footprint outside every tile (water or edge) gets `tiles: []`. The Act panel says "Outside the data grid" and disables cooling actions.
- **Area tool:** click, shift-click and shift-drag select tiles. `cellsInBox` uses tile centroids.
- **Cooling model** (`lib/cooling.ts`), replacing "effects stay in the treated hex":
  - Building action, air: the treated area (roof area or, for green walls, wall area) is spread over the 5 × 5 neighbourhood of `primaryTile`. Every present tile gets the same share, `treated ÷ Σ landAreaM2 of the neighbourhood's present tiles`. Tiles missing from the grid are skipped, and the denominator uses only present tiles.
  - Building action, surface: `share_k = overlapM2_k / landAreaM2_k`, capped at 1, on each overlapped tile. The roof area is the footprint area (as today), so overlaps sum to the roof area.
  - Area action: each selected tile has share 1 for both air and surface (as today).
  - Air and surface shares are capped separately: per tile, if a kind's shares sum to more than 1, they are scaled so the total is 1. Coefficients are unchanged (`lib/interventions.ts`).
  - Documented in the file header and the Method tab as a modelling assumption, not a validated model.
- `HEX_AREA_M2`, `buildingCell` and the h3-js use in the web are removed. h3-js stays only if something else needs it. If not, the dependency is removed.
- Store, test hook and e2e helpers: rename hex to tile in the public names (`hexColor` becomes `tileColor`). The test hook exposes `state.selection` as today.

## Tech Stack

Unchanged except:
- Removed: `@deck.gl/geo-layers` (H3HexagonLayer) and h3-js if unused, from the web; h3 from the pipeline if unused. Removing `@deck.gl/geo-layers` should also clear the 11 `npm audit` findings, which is to be checked.
- Added: nothing. Asking first is required if clipping or projection turns out to need a library such as `@turf/intersect` or `proj4`.
- Pipeline: geopandas 1.2.0, shapely 2.2.0, pyproj (via geopandas; declare it explicitly since `grid.py` will import it), rasterio 1.5.2.

## Commands

```
make check                                   # web lint+typecheck+vitest, pipeline pytest
make build                                   # next build
cd web && npm run e2e                        # Playwright, needs NEXT_PUBLIC_MAPBOX_TOKEN, ~4 min
cd web && npx playwright test e2e/<spec>     # one spec
cd pipeline && uv run pytest -q
cd pipeline && uv run python -m coolboston.run_landsat    # network; rebuilds the surface cache on tiles
cd pipeline && uv run python -m coolboston.build_cells    # writes web/data/cells.json
```

## Project Structure

```
pipeline/src/coolboston/grid.py         square grid in EPSG:26986, clip to boundary (replaces H3)
pipeline/src/coolboston/heatwatch.py    unchanged loader; join target becomes tiles
pipeline/src/coolboston/zonal.py        pixel → tile assignment (replaces pixel_cells H3 lookup)
pipeline/src/coolboston/run_landsat.py  writes pipeline/cache/surface_2019.json keyed by tile id
pipeline/src/coolboston/build_cells.py  replaces build_hexes.py; writes cells.json v4
pipeline/tests/test_grid.py, test_zonal.py, test_build_cells.py
web/data/cells.json                     replaces hexes.json
web/app/api/cells/route.ts              replaces app/api/hexes
web/lib/types.ts                        Cell, CELLS_SCHEMA_VERSION = 4, SelectedBuilding.tiles
web/lib/data.ts                         parseCells, CELLS_URL
web/lib/grid.ts                         tile id parse/neighbourhood, bbox index, footprint overlap (new)
web/lib/cooling.ts                      shares per the rules above
web/components/layers/HeatLayer.ts      becomes Mapbox fill source/layer config (or HeatFill.tsx)
web/e2e/*.spec.ts, helpers.ts           hex → tile
```

## Code Style

Match the existing `lib/` style: pure functions, a doc comment stating the rule, named constants, no React.

```ts
/** Tile id "{i}_{j}" for State Plane metres; see .kiro/specs/SPEC-square-grid.md. */
export const CELL_SIZE_M = 100;
export const NEIGHBOURHOOD_RADIUS = 2; // 5 × 5 tiles ≈ 25 ha, the Heat Watch source resolution

export function neighbourhood(id: string, r = NEIGHBOURHOOD_RADIUS): string[] {
  const [i, j] = parseTileId(id);
  const out: string[] = [];
  for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) out.push(`${i + di}_${j + dj}`);
  return out;
}
```

Python follows the current modules: module docstring with source and method, type hints, small functions, `allow_nan=False` on JSON output.

## Testing Strategy

- **Pipeline (pytest):**
  - Grid on a synthetic boundary: tile count, ids, clipping, sliver drop, land area.
  - Pixel → tile assignment.
  - The area-weighted air join on tiles.
  - The v4 writer: schema keys, closed rings, nulls not 0.
- **Web unit (Vitest):**
  - `parseCells` accepts and rejects.
  - Tile id and neighbourhood.
  - Footprint-to-tile overlap: inside one tile, straddling 2 and 4 tiles, partly outside the grid. Overlaps sum to the footprint area within 0.5%.
  - Cooling shares:
    - The air spread is uniform over present tiles and sums to the treated area.
    - Surface goes only to overlapped tiles.
    - Caps work per kind.
    - The worked example: a 5,164 m² green roof gives about −0.1 °F air per neighbourhood tile and about −29 °F surface on a tile it half covers.
- **E2E (Playwright):** the 9 existing specs, migrated to tiles. Plus one new assertion: a building straddling two tiles colours both in Change mode, and its neighbourhood shows the small air change.
- No test is deleted or skipped. Specs that assert hex behaviour are rewritten to the tile equivalent.

## Boundaries

- **Always:**
  - Run `make check` and the relevant e2e spec before each commit.
  - Change the schema version in pipeline and web in one commit.
  - Use `null` for missing.
  - Label surface values "mid-morning".
  - Stage specific files.
- **Ask first:**
  - Adding any dependency.
  - Switching to vector tiles.
  - Changing the tile size or neighbourhood radius.
  - Changing intervention coefficients.
  - Anything that needs a network re-run beyond `run_landsat` (Planetary Computer).
- **Never:**
  - Deploy or push without being asked.
  - Commit `web/.env.local` or the token.
  - Stage `skills-lock.json`, `.agents/` or `.kiro/skills/`.
  - Present tile air values as finer-resolution measurements.

## Success Criteria

1. `cells.json` v4 is produced by `build_cells` with about 12,000 tiles (exact count recorded), within 3 MB. At least 98% of tiles have `temp3pm`, and at least 99% have `surface`.
2. The map renders the tile grid as a flat Mapbox `fill` layer under 3D buildings, with no visible borders. The deck.gl hex layer is gone. Air/Surface and Heat/Change still work.
3. Selecting a building records its overlapped tiles and outlines them. The area tool selects tiles by click, shift-click and drag.
4. Applying an action changes the overlapped tiles' surface and the 5 × 5 neighbourhood's air, per the share rules. Unit tests cover the worked example.
5. `make check`, `make build` and all e2e specs pass (9 migrated plus the new straddle check). No console errors.
6. Panning or zooming does not rebuild the GeoJSON source or recompute deltas. A unit or e2e check counts source updates.
7. `tasks/plan.md` and the steering docs (`architecture.md`, `conventions.md`, `tech-stack.md`) say tiles instead of hexes, and record the share rule as an assumption.

## Open Questions

- The surface cache must be rebuilt on tiles. Today only per-hex means are cached (`pipeline/cache/surface_2019.json`), not the composite raster, so `run_landsat` re-downloads the 9 scenes from Planetary Computer. Proposed: also cache the composite GeoTIFF (gitignored) so later grid changes don't need the network.
- Hex click currently needs the heat layer visible. Should tile clicks work with the heat layer hidden? Assumed yes, by hit-testing tile polygons instead of rendered features.
