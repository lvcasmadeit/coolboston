---
inclusion: always
---

# Tech Stack

CoolBoston is a 3D map of Boston's urban heat. An offline Python pipeline writes one JSON file, and a Next.js app reads it. There is no backend. Versions below are the pinned values in `web/package.json` and `pipeline/pyproject.toml`.

## Web app (`web/`)

Runtime
- Next.js 16.4.3 (App Router), TypeScript 5.9.3 in strict mode. `next.config.ts` enables `cacheComponents` and `partialPrefetching`.
- React 19.3.0.
- Mapbox GL JS 3.33.0 through react-map-gl 8.1.3 (`react-map-gl/mapbox`). The basemap is the Mapbox Standard style.
- deck.gl 9.4.0: `@deck.gl/mapbox` for the interleaved overlay, `@deck.gl/geo-layers` for `H3HexagonLayer`.
- Zustand 5.0.16 for client state.
- Tailwind CSS 4.3.3 via `@tailwindcss/turbopack`.
- shadcn 4.22.1 with radix-ui 1.8.1 (style `radix-nova`, base colour neutral, lucide-react 1.61.0 icons).
- class-variance-authority 0.7.1, the `cn` package 0.5.0 (re-exported as `cn()` from `lib/utils.ts`), tw-animate-css 1.4.0.
- Geist and Geist Mono via `next/font/google`.

Tooling
- npm, with `package-lock.json`. Scripts: `dev`, `build`, `start`, `lint` (ESLint 9.39.5 with eslint-config-next 16.4.3), `test` (`vitest run`), `test:watch`, `typecheck` (`tsc --noEmit`).
- Vitest 5.0.5 with jsdom 30.1.3, @testing-library/react 16.3.3, @testing-library/dom 10.4.2. Config: `web/vitest.config.mts`.
- @playwright/test 1.64.1 is installed for the smoke test (Task 36). There is no `e2e/` directory yet.
- @types/node 24.19.2, @types/react 19.3.0.

Planned, not installed: Recharts, to be re-added for the charts (Task 32). It was removed in Task 13. Do not add it before that task.

Configuration: `NEXT_PUBLIC_MAPBOX_TOKEN` goes in `web/.env.local` (template in the root `.env.example`). It must be a public `pk.` token. Never put an `sk.` secret in a `NEXT_PUBLIC_` variable.

## Pipeline (`pipeline/`)

- Python 3.12 (`.python-version`; `requires-python >=3.12`).
- uv manages the environment and lockfile (`uv.lock`). Build backend: uv_build. Package: `coolboston`, in `src/coolboston/`.
- Pinned dependencies: geopandas 1.2.0, h3 4.5.0 (v4 API: `geo_to_cells`, `cell_to_boundary`, `latlng_to_cell`), rasterio 1.5.2, shapely 2.2.0.
- Dev: pytest 9.1.1.
- `zonal.py` also imports `affine`, `pyproj` and `numpy`. None are declared directly; they arrive through rasterio and geopandas. Declare them if that changes.

Commands, run from `pipeline/`:
- `uv run pytest`
- `uv run python -m coolboston.run_landsat` (once, needs network; writes `pipeline/cache/surface_2019.json`)
- `uv run python -m coolboston.build_hexes` (reads the cache; writes `web/data/hexes.json`)

## External data

- City of Boston boundary: gis.boston.gov ArcGIS. Cached in `pipeline/data/raw/`.
- 2019 Heat Watch (CAPA / Museum of Science): ArcGIS FeatureServer, layer 2. Cached in `pipeline/data/raw/`.
- Landsat Collection 2 Level-2 scenes: Microsoft Planetary Computer STAC search (`landsat-c2-l2`) with a SAS token.
- Mapbox: basemap, buildings and tiles, loaded in the browser with a public token.
- Cost, energy and tariff figures (EIA, NREL PVWatts, LBNL, EPA, vendor sources) are hard-coded with citations in `web/lib/interventions.ts`. The app does not fetch them at runtime.

## Hosting

Vercel is planned (Task 37). `.vercel/` is gitignored. Nothing is deployed yet.
