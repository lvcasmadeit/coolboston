# Implementation Plan: Boston Urban Heat Island Dashboard

## Overview
A solo, 9-hour build of a 3D Mapbox dashboard that shows where Boston's urban heat is concentrated (Landsat 2013-2025) and which intervention (green roofs, cool roofs, solar, trees, cool pavement) fits each place, with a what-if simulator. Research, scoring formulas and architecture live in `../PLAN.md`; this file is the execution plan and index. Detailed tasks with acceptance criteria are in `todo.md`.

Tasks are tracked in `tasks/todo.md` (markdown checklist).

## Architecture Decisions (summary; full rationale in ../PLAN.md)
- Next.js App Router, client-only Mapbox GL + deck.gl (interleaved), Zustand, Recharts, Tailwind + shadcn/ui.
- No runtime backend: offline Python (uv) writes `web/data/hexes.json`; Next route handlers serve it.
- H3 res-9 hex grid is the unit of analysis. Scoring formulas live only in `web/lib/scoring.ts`; Python building scores are checked against it by a shared fixture.
- Changed from ../PLAN.md: the what-if simulator (Phase 6) now comes before per-building scores (Phase 7), because the simulator needs only hex-level data and is a stronger demo moment.

## Task List

### Phase 0: Foundation (90 min)
- [x] Task 1: Repo scaffold
- [x] Task 2: Next.js app and tooling
- [x] Task 3: Zustand store with core state
- [x] Task 4: Dashboard layout shell
- [x] Task 5: 3D Mapbox map, client-only
- [x] Task 6: deck.gl interleaved overlay spike

### Checkpoint A: Foundation
- [ ] Tests, lint and build pass; 3D map with a deck.gl layer renders

### Phase 1: Heat hexes (70 min)
- [x] Task 7: Pipeline scaffold, boundary, H3 grid
- [x] Task 8: Heat Watch ingest and area-weighted join
- [x] Task 9: hexes.json writer and /api/hexes
- [x] Task 10: Heat hex layer, color ramp, tooltip

### Checkpoint B: Heat on the map

### Phase 2: Landsat and timeline (125 min, highest risk)
- [ ] Task 11: Landsat STAC search spike
- [ ] Task 12: Temperature conversion and cloud mask
- [ ] Task 13: Yearly median composites
- [ ] Task 14: Zonal stats onto hexes
- [ ] Task 15: Colorized yearly PNG overlays (stretch)
- [ ] Task 16: Timeline playback logic
- [ ] Task 17: Timeline UI
- [ ] Task 18: Year-driven recolor and raster overlay

### Checkpoint C: Heat animates over years

### Phase 3: Selection, metrics, charts (60 min)
- [ ] Task 19: /api/hex/[id]
- [ ] Task 20: Series transform library
- [ ] Task 21: Hex click selection
- [ ] Task 22: City vs hex line chart
- [ ] Task 23: Delta chart and metric cards

### Checkpoint D: Click → charts

### Phase 4: Context layers (73 min)
- [ ] Task 24: Canopy per hex
- [ ] Task 25: Social vulnerability per hex
- [ ] Task 26: Parking share per hex (stretch; drops cool pavement if cut)
- [ ] Task 27: Layer registry
- [ ] Task 28: Layers panel and rendering

### Checkpoint E: Context layers

### Phase 5: Scoring (90 min)
- [ ] Task 29: Roofs ingest and hex aggregation
- [ ] Task 30: Solar potential per hex
- [ ] Task 31: Scoring library
- [ ] Task 32: Intervention selector recolors map
- [ ] Task 33: Hex recommendation card
- [ ] Task 34: Methodology tab

### Checkpoint F: Recommendations (MVP core complete)

### Phase 6: What-if simulator (55 min, stretch)
- [ ] Task 35: Cooling coefficients
- [ ] Task 36: What-if calculation
- [ ] Task 37: Simulate panel
- [ ] Task 38: Delta layer and result metrics

### Checkpoint G: Simulator

### Phase 7: Per-building scores (70 min, stretch)
- [ ] Task 39: Building scores in Python plus shared fixture
- [ ] Task 40: Python / TypeScript parity test
- [ ] Task 41: Building export and delivery
- [ ] Task 42: Data-driven extrusion coloring
- [ ] Task 43: Building click popup

### Checkpoint H: Buildings

### Phase 8: Polish and deploy (70 min)
- [ ] Task 44: Visual polish (stretch)
- [ ] Task 45: Loading, empty, error states and accessibility
- [ ] Task 46: Playwright smoke test
- [ ] Task 47: Deploy to Vercel
- [ ] Task 48: Backup demo video and README

### Checkpoint Final

## Schedule reality check
Summing the task estimates gives about 11.7 hours, more than the 9 available. The 8.5-hour figure in ../PLAN.md was optimistic. Estimates are my guesses and especially uncertain for the Landsat and data-join tasks.

| Scope | Phases | Approx. time |
|---|---|---|
| MVP only (skip Task 15, 26, 44 and Phases 6-7) | 0-5 + Tasks 45-48 | about 9.0 h |
| MVP + what-if | add Phase 6 | about 10 h |
| Everything | all | about 11.7 h |

Suggested path: build through Checkpoint F, then Phase 6, then Phase 8 deploy tasks. Do Phase 7 only if more than ~90 minutes remain. Because the MVP alone is tight, decide at Checkpoint C (about 4.5 h in): if Landsat is behind, switch to every-other-year composites.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Landsat composites slow or messy (clouds, asset names, reprojection) | High | Spike in Task 11 first; time-box Phase 2; fall back to every-other-year or fewer years |
| deck.gl interleaved layering with 3D buildings misbehaves | Medium | Spike in Task 6 right after the map works; fall back to overlaid (non-interleaved) mode |
| Source datasets change shape or are hard to download (Heat Watch hexes, canopy, NREL PV) | High | Download raw files in the first hour; cache in `pipeline/data/raw/`; documented proxies for PV and flat roofs |
| Scope exceeds 9 hours | High | Tiering above; cut order: Phase 7, Task 44, Task 15, Task 26 (and cool pavement), then Phase 6 |
| Mapbox token exposed or map-load overage | Medium | URL-restrict the token; keep map mounted once; monitor usage in the Mapbox dashboard |
| Cooling coefficients overstated | Medium | Cite sources, show ranges, label every estimate approximate |
| Venue wifi fails during the demo | Medium | Backup video (Task 48); test deployed URL early |

## Open Questions
- Which exact Analyze Boston / MassGIS layer has canopy %, and which roof layer has a usable flat-roof indicator? (Resolve in Tasks 24 and 29; record in ../PLAN.md.)
- Any hackathon-provided data, judging rubric, or required demo format?
- Keep cool pavement, or cut it with Task 26?
