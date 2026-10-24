---
inclusion: always
---

# Conventions

Where things live: task list and per-task rules in `tasks/todo.md`; product spec in `PLAN.md`; architecture and input sources in `tasks/plan.md`; UI revamp in `planui.md`. This file records patterns the code already follows.

## Next.js

- `web/AGENTS.md` says this Next.js version has breaking changes. Read the relevant guide in `web/node_modules/next/dist/docs/` before writing Next.js code, and heed deprecation notices.
- Client-only code starts with `"use client"`. The map is loaded with `next/dynamic` and `ssr: false`, because mapbox-gl needs `window`.
- Imports use the `@/` alias, which points to the root of `web/`.

## Pipeline and web contract

- `web/data/hexes.json` is the only interface between the two halves. Its version is set in two places: `SCHEMA_VERSION` in `pipeline/src/coolboston/build_hexes.py` and `HEXES_SCHEMA_VERSION` in `web/lib/types.ts`. Change both in the same commit. The current version is 3.
- The web checks the file with `parseHexes` in `web/lib/data.ts`. It rejects missing keys, unknown keys, the wrong version and non-finite numbers. Keep the validator and the type in step.
- The pipeline writes JSON with `allow_nan=False`, so bad values fail loudly instead of producing `NaN` tokens.

## Missing data

- Use `null`, never `0`. Heat Watch stores unsampled hexes as 0, and `heatwatch.py` turns those into NaN. `join.py` returns NaN for cells with no valid source.
- In the web, the value type is `number | null`. Display missing values as "No data" (`formatTemp` in `lib/heat.ts`).

## Units and time

- The hex contract uses °F. Landsat DN is converted to °C in `lst.py`, composited, and only then converted to °F (`celsius_to_f`) in `run_landsat.py`.
- Coefficients in the catalog come from sources in °C or $/ft². Convert them in code (`cToF`, `perFt2`) and keep the source unit in the citation.
- Surface values are mid-morning (about 11:15 a.m. EDT). Label them "mid-morning" wherever they appear. Never put them on the same time axis as the 3pm air value without that label.

## Estimates and sources

- Every coefficient, cost and energy value lives in `web/lib/interventions.ts`. Each has a citation (`SRC.*`) and a stated scale.
- An assumption is labelled as one in code (see `COOL_ROOF_ALBEDO_CHANGE`). A value with no source is "not quantified". Do not guess.
- The UI labels every figure as an estimate.

## Web code layout

- `lib/`: pure functions, types, store and config (`heat.ts`, `colors.ts`, `interventions.ts`, `mapConfig.ts`, `store.ts`). Keep React out of these so they test directly.
- `components/`: React components. Map layers are factories in `components/layers/` (`createHeatLayer`). Hooks sit next to the component that uses them (`useHexes.ts`).
- `components/ui/`: shadcn components, configured by `web/components.json`.
- `app/`: routes and layout. `app/api/hexes/route.ts` imports the JSON statically, so `next build` fails on a bad file.
- Naming: components PascalCase; functions camelCase; module constants UPPER_SNAKE (`HEAT_RAMP`, `BOSTON_VIEW`, `SLAB_HEIGHT_M`).
- State: `createDashboardStore()` builds a fresh store for tests. `dashboardStore` is the app singleton. Read it with `useDashboard(selector)`.

## Map rules

Keep the comments that explain these; each one records a bug or a Mapbox limit.
- The map instance is created once (`reuseMaps`). Each new instance is a billable Mapbox load. Free tier: 50,000 per month.
- One deck.gl overlay per map instance, kept in a WeakMap in `DeckOverlay.tsx`. Attaching a second one breaks WebGL under React StrictMode.
- deck.gl runs interleaved (`interleaved: true`). Layers are placed by `slot`.
- Keep the camera at zoom 15 or higher. Mapbox Standard draws 3D buildings only from there.
- Put layer opacity in the fill colour's alpha (`heatColor(..., alpha)`), not in the `opacity` prop. deck.gl gamma-corrects that prop.
- Mapbox tokens must start with `pk.`. `checkMapboxToken` rejects anything else.

## Styling and accessibility

- Tailwind utility classes built on theme tokens: `bg-card`, `text-muted-foreground`, `border-border`, `bg-muted`, `bg-destructive`. Light theme only. Dark mode was removed.
- Landmarks have labels: `<aside aria-label>`, `<main aria-label>`, `<section aria-label>`.
- Error messages use `role="alert"`. The legend is a `role="group"` with a label.
- Decorative icons get `aria-hidden`.
- The legend shows the min and max as text, not just colour.

## Errors

- Fail loudly, with a message that names the fix. `HexDataError` names the bad field. `CompositeError` names the year. The `FileNotFoundError` in `add_surface` names the command to run.
- Do not swallow errors in the pipeline. In the web, fetch errors go into state (`useHexes` returns `status: "error"`).

## Python pipeline

- One module per step. Each module starts with a docstring that says what it does, how to run it, and any source caveat (see `heatwatch.py` and `landsat.py`).
- `fetch_*` functions download once and reuse the cached file. The path is a default argument so tests can pass a temp path.
- Keep logic pure and test it without network: query builders, DN conversion, QA masks, composite and zonal means. Live calls (`search_scenes`) stay thin.
- Constants cite their source in a comment (`ST_SCALE`, `QA_*`, `BOSTON_BBOX`).
- Tests are `pipeline/tests/test_<module>.py`, run with pytest.
- No Python formatter or linter is configured. Match the surrounding style.

## Tests

- A behaviour change ships with a test.
- Pipeline: `uv run pytest`. Web: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- Web tests are `*.test.ts` or `*.test.tsx`, next to the code they cover. Vitest runs them with jsdom.
- Do not start a task on a red build (`tasks/todo.md`).

## Git

- One commit per task. Follow the prefixes in history: `feat(web):`, `feat(pipeline):`, `fix(web):`, `refactor(web):`, `docs:`, `chore:`.
- History is linear on `main`. Do not push unless asked. Do not commit unless asked.
- `pipeline/cache/`, `pipeline/data/raw/`, `.env*` and `.vercel/` are gitignored. Do not stage them.

## Secrets

- Only `pk.` Mapbox tokens reach the browser.
- Do not read or echo values from `web/.env.local`.
