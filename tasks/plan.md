# Implementation Plan: CoolBoston, interactive heat-island interventions

## Overview
A 3D Mapbox app where users **select a building or an area of Boston, apply a cooling action** (green roof, cool roof, rooftop solar, street trees, cool pavement, depave to green space), and **watch the surrounding heat map cool**. Base heat is the 2019 Heat Watch 3pm air temperature on an H3 res-10 grid, drawn as a translucent 18 m slab (see `../planui.md`).

**Pivot (Sat 12:33):** the Landsat timeline, year playback, year-by-year charts, and the adoption-percentage simulator are dropped entirely. The per-hex scoring and recommendation phases are reduced to a stretch "suitability hint". Completed work (Phases 0–1, UI and map revamp) carries over unchanged.

Detailed tasks with acceptance criteria are in `todo.md`. `../PLAN.md` still describes the old timeline direction and needs a follow-up rewrite (Task 11).

## Architecture Decisions
- Unchanged: Next.js App Router, client-only Mapbox GL (Standard) + deck.gl interleaved, Zustand, Tailwind + shadcn/ui (Recharts removed: no charts); offline Python (uv) writes `web/data/hexes.json`, served by `/api/hexes`.
- **Cooling runs in the browser.** `applyActions(baseHexes, actions)` is a pure function from the user's action list to adjusted per-hex temperatures; no server state, no backend.
- **Buildings come from Mapbox Standard's `buildings` featureset** (click via `map.addInteraction`, highlight via feature state). No building dataset to download or host. Task 16 is a spike that confirms the returned geometry and height are usable; the fallback is a downtown-only footprint GeoJSON from Analyze Boston.
- **Areas are sets of H3 cells** (click, shift-click, box-drag), so area actions use the same grid as the heat data. Each area action treats a **fixed share** of the selected area, set per action in the catalog (no user slider). Free-form polygon drawing is a stretch.
- **Heat is 3pm only.** No timeline and no time-of-day comparison; the 6am/7pm Heat Watch values are removed from the data (Task 13b).
- **Cooling model:** a treated area produces a source reduction in its hex (coefficient × treated fraction of the hex), which spreads to neighbouring hexes with an H3-ring falloff. Coefficients are cited, carry low/central/high ranges, and every number on screen is labelled an estimate.
- **Color domain is fixed to the baseline min/max**, so cooled hexes visibly shift toward blue instead of the ramp re-stretching. A "Change" view shows ΔT on its own scale, so small effects stay visible.
- `h3-js` becomes a direct, pinned dependency (building centroid → cell, ring neighbours).

## Task List

### Done
- [x] Phase 0: Foundation (Tasks 1–6), Checkpoint A
- [x] Phase 1: Heat hexes (Tasks 7–10), Checkpoint B
- [x] UI revamp and map look v2 (`../planui.md`): light theme, Standard basemap, res-10 slab, rainbow ramp

### Phase 2: Pivot cleanup
- [x] Task 11: Docs: rewrite PLAN.md for the new direction
- [x] Task 12: Store refactor: drop timeline state, add selection and actions
- [x] Task 13: Layout refactor: remove timeline UI and intervention dropdown
- [x] Task 13b: Drop 6am/7pm temperatures from the data

### Checkpoint C: Clean base (passed)

### Phase 3: Selection (highest risk)
- [ ] Task 14: Intervention catalog and cooling coefficients
- [ ] Task 15: Geometry helpers (footprint area, building → hex)
- [ ] Task 16: Building selection spike (Standard featureset)
- [ ] Task 17: Building selection and highlight
- [ ] Task 18: Area selection on hexes

### Checkpoint D: Select a building or an area

### Phase 4: Cooling model
- [ ] Task 19: Cooling model (`applyActions`)
- [ ] Task 20: Heat layer driven by adjusted temperatures

### Checkpoint E: Actions cool the map (via test hook)

### Phase 5: Action UI and visuals
- [ ] Task 21: Action panel for the current selection
- [ ] Task 22: Active interventions list (remove, undo, reset)
- [ ] Task 23: Roof markers on treated buildings
- [ ] Task 24: Change view (ΔT) and legend

### Checkpoint F: Core loop complete (MVP)

### Phase 6: Impact summary
- [ ] Task 25: Impact metrics
- [ ] Task 26: Impact cards

### Checkpoint G: Impact shown

### Phase 7: Stretch
- [ ] Task 27: Suitability hint for the selected building (canopy / roof size)
- [ ] Task 28: Shareable scenario URL
- [ ] Task 29: Free-form area drawing

### Phase 8: Polish and deploy
- [ ] Task 30: Loading, empty, error states and accessibility
- [ ] Task 31: Playwright smoke test of the core loop
- [ ] Task 32: Deploy to Vercel
- [ ] Task 33: README and backup demo video

### Checkpoint Final

## Order of work
Build through Checkpoint F (the core loop), deploy (Task 32) so the URL is known, then Phase 6, then the rest of Phase 8. Phase 7 only after Checkpoint G.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Standard's building featureset doesn't return usable footprints or heights (tile-clipped, missing `height`) | High | Spike first (Task 16). Fallback: downtown-only footprint GeoJSON (Analyze Boston), with Standard buildings kept for looks |
| Realistic cooling from one building is ~0.1 °F, invisible on a 6.7 °F ramp | High | Fixed baseline domain plus a Change view on its own ΔT scale (Task 24); area actions produce larger effects; never inflate coefficients to look better |
| Cooling coefficients overstated or unsourced | Medium | Every coefficient cited with a range (Task 14); "estimate" labels in UI; method notes in README |
| Recomputing the cooling for 8,044 hexes on every action is slow | Low | Pure function over only the affected cells (ring radius ≤ 3); memoized; test the runtime |
| Box-drag selection fights map panning | Medium | Shift + drag for the box, plain drag pans; documented in the UI |
| Map-load overage / token exposure | Medium | Unchanged: URL-restricted token, single map instance (verified: one style request per load) |
| Scope exceeds what's left of the hackathon | High | Cut order: Phase 7, Task 26, Task 23 roof markers, Task 18 box-drag (keep click selection) |

## Open Questions
- Which cooling coefficients to use per action (Task 14 researches and cites them; expect EPA Heat Island Compendium and peer-reviewed field studies).
