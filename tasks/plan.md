# Implementation Plan: CoolBoston

## Overview
A 3D Mapbox map of Boston where the user selects a building or an area, applies a cooling action, and sees the change in air temperature, surface temperature and heat-island percentage, plus an estimated energy offset and capital cost. Base data: 2019 Heat Watch 3pm air temperature on an H3 res-10 grid (8,044 cells, 7,908 with data) and a summer 2019 Landsat surface temperature composite. Product definition: `../PLAN.md`. Tasks and acceptance criteria: `todo.md`.

Every number in the app is an estimate and is labelled as one.

## Architecture Decisions
- **No backend.** Offline Python (uv) writes `web/data/hexes.json`. A Next.js route handler serves it. The impact model runs in the browser.
- **Map:** Mapbox Standard, client-only, mounted once. Heat layer is a translucent 18 m slab in the `middle` slot. Deck.gl runs interleaved.
- **Selection:** a building comes from Mapbox Standard's `buildings` featureset (verified by spike, Task 21). An area is a set of H3 cells (click, shift-click, shift-drag box).
- **Impact model (share-based, per hex):** each action's treated share of its hex is `s = treated area ÷ hex area`, capped at 1. Effects stay inside the treated hex. Several actions in one hex add up. There is no spread to neighbours and no extra cap.
- **Cooling formulas** (coefficients in `web/lib/interventions.ts`, every value sourced):
  - Cool building (roof): air ΔT = −0.61 °C × (0.3 × s) ÷ 0.1. The 0.3 roof albedo change is an assumption, labelled as one. Surface ΔT (hex) = −55 °F × s (roof change 50–60 °F, EPA peak-summer).
  - Green roof: air ΔT = −5 °F × s, a citywide proxy used as an upper bound. Surface ΔT (hex) = −56 °F × s ("up to", EPA peak-summer).
  - Street trees: air ΔT = −0.07 °C × s (Smith et al. 2025, per +0.1 canopy, with +0.10 canopy over the selected share).
  - Solar, green walls, and the solar part of green roof + solar: no air or surface effect.
- **Heat-island metric:** H = hex temperature − citywide mean of valid hexes (fixed at baseline). After an action, the change is shown as `(H_before − H_after) ÷ H_before × 100`. It is n/a when `H_before ≤ 0.5 °F`.
- **Surface layer:** Landsat, summer 2019 median composite of masked scenes, averaged per hex. It is a mid-morning value (Landsat 8 and 9 cross the equator at about 10:12 a.m. local solar time, roughly 11 a.m. EDT over Boston by my conversion). It is labelled as such and never presented as a 3pm value.
- **Costs and energy:** capital cost is a low/central/high range per building or per m² (catalog values in Task 14). Energy offset is in kWh/yr and $/yr for solar and for any roof or wall figure that gets sourced. Where no source is found, the card shows "not quantified".
- **Roof rule:** one roof action per building. The only combination is green roof + solar, which counts as one roof action. Green walls can be added with any roof action.
- **Charts:** Recharts is re-added at its previously pinned version (3.10.1). It was removed in Task 13.
- **Security:** read-only public data, no authentication, no server-side user state. Share links, if built, are validated and never evaluated.

## Task List

### Done
- [x] Phase 0: Foundation (Tasks 1–6), Checkpoint A.
- [x] Phase 1: Heat hexes (Tasks 7–10), Checkpoint B.
- [x] UI revamp and map look v2 (`../planui.md`).
- [x] Phase 2: Pivot cleanup (Tasks 11–13b), Checkpoint C.

### Phase 3: Inputs and surface data
- [ ] Task 14: Source the remaining inputs
- [ ] Task 15: Landsat 2019 search and asset check
- [ ] Task 16: Landsat DN conversion and QA mask
- [ ] Task 17: Summer 2019 composite and per-hex mean
- [ ] Task 18: Surface field in hexes.json v3

### Phase 4: Selection
- [ ] Task 19: Intervention catalog
- [ ] Task 20: Geometry helpers
- [ ] Task 21: Building selection spike (Mapbox featureset)
- [ ] Task 22: Building selection and highlight
- [ ] Task 23: Area selection on hexes

### Checkpoint D: After Tasks 14–23
- [ ] Tests and build pass
- [ ] A building and an area can each be selected and cleared
- [ ] Spike decision recorded in this file (Task 21)
- [ ] Review with human before proceeding

### Phase 5: Impact model and map
- [ ] Task 24: Hex impact model
- [ ] Task 25: Heat-island, energy and cost metrics
- [ ] Task 26: Air / Surface base layer and Change mode

### Checkpoint E: After Tasks 24–26
- [ ] Tests and build pass
- [ ] An action added through a test hook cools its hex on the map
- [ ] Review with human: are effect sizes readable, or does the Change view need more work?

### Phase 6: Act panel and layout
- [ ] Task 27: Act panel
- [ ] Task 28: Applied actions list
- [ ] Task 29: Treated roof markers
- [ ] Task 30: Metric cards
- [ ] Task 31: Layers tab and top-bar view controls

### Checkpoint F: Core loop complete
- [ ] Select building, apply green roof, see the map and metrics change, remove it, see it restore
- [ ] Same loop for an area with street trees
- [ ] Deploy the current build now (Task 37) so the URL is known early
- [ ] Review with human before proceeding

### Phase 7: Charts
- [ ] Task 32: Recharts and cost-versus-effect chart
- [ ] Task 33: Before-and-after chart

### Checkpoint G: Charts
- [ ] Both charts update with actions and show an empty state with none

### Phase 8: Stretch
- [ ] Task 34: Shareable scenario URL

### Phase 9: Polish and deploy
- [ ] Task 35: Loading, error states and accessibility
- [ ] Task 36: Playwright smoke test
- [ ] Task 37: Deploy to Vercel
- [ ] Task 38: README and backup demo video

### Checkpoint Final
- [ ] All tests pass; deployed demo runs the core loop end to end
- [ ] Backup video recorded

## Order of Work
Phase 3 first, because the catalog needs its inputs and the surface layer needs its data. Then selection, the model, the Act panel, and the charts. Deploy (Task 37) as soon as Checkpoint F passes. Phase 8 and the polish tasks come last.

## Inputs (Task 14 fills the open rows)

| Input | Value so far | Source | Status |
|---|---|---|---|
| Green roof installed cost | $10 / $18 / $30 per ft² | New England Metal Roof (2026); HomeGuide; HomeAdvisor | Found. Vendor and consumer sources, low–medium confidence. Central is the midpoint of the cited ranges. |
| Cool roof coating installed cost | $1.50 / $3 / $5 per ft² | New England Metal Roof (2026): coating $0.75–2.50 plus labour $1.50–3.50 | Found. Vendor, medium confidence. |
| Solar installed cost | $3.20 / $3.60 / $4.00 per W | solarpanelsnetwork.com (MA $3.20–3.80/W); poweroutage.us (Boston $3.97–4.02/W) | Residential only. Commercial pending. |
| Green wall installed cost | $95 / $165 / $265 per ft² | designerplants.com; instantjungle budget sheet; illustrarch.com; buildwithrise.com | Found. Mostly indoor systems, low confidence. |
| Street tree planting cost per m² | — | — | Pending. |
| Solar yield, Massachusetts | 1,320–1,425 kWh per kW per year | NREL PVWatts v8 state average, 4.7 peak-sun-hours × 365 × 0.77–0.83 derate (thegreenwatt.com) | State average. Boston run pending. |
| Usable roof share and panel kW per m² | — | — | Pending. |
| Energy per m² per year: green roof, cool roof, green walls | — | ORNL: green roof saves about 12% of a Boston one-storey building's heating and cooling (no per m² figure). Springer per m² figure has no stated climate. | Pending. Unusable as found. |
| Electricity rate | 29.35¢/kWh, Massachusetts residential | palmetto.com | Residential. Commercial pending. |
| Cool roof air coefficient | −0.61 °C per +0.1 surface albedo, afternoon | Smith et al. 2025, *Communications Earth & Environment* 6:507 | Found. Regional regression, not a per-building test. |
| Roof albedo change for a cool coating | 0.3 | Assumption | Labelled as an assumption until sourced. |
| Tree canopy air coefficient | −0.07 °C per +0.1 canopy fraction | Smith et al. 2025 | Found. |
| Green roof air proxy | up to −5 °F citywide | EPA "Using Green Roofs" (2019 snapshot) | Proxy and upper bound. The current EPA page gives "up to 20 °F nearby", which is not used. |
| Roof surface change | Green roof up to 56 °F lower; cool roof 50–60 °F lower | EPA "Using Green Roofs" and "Using Cool Roofs" | Found. Peak-summer values, not averages. |
| Landsat overpass time | About 10:12 a.m. local solar time (descending) | USGS and NASA | Found. Clock-time conversion for Boston is my arithmetic. |
| Mapbox buildings featureset properties | — | Docs page cut off before the Buildings section | Unverified. Task 21 decides. |
| Landsat 8 thermal asset key | `lwir` seen on a Landsat 7 item; `lwir11` assumed for Landsat 8 | Planetary Computer STAC | Unverified for Landsat 8. Task 15 checks. |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| The surface layer is a mid-morning value, not 3pm. Comparing it with 3pm air misleads. | High | Label every surface figure "Landsat, summer 2019, mid-morning". Never place surface and air values on the same time axis without that label. |
| Landsat 2019 has one Landsat 8 scene under 20% cloud, plus Landsat 7 with scan-line gaps. | Medium | Median over all masked scenes. Check per-hex coverage in Task 17. Show "no surface data" for uncovered hexes. |
| Cost and energy figures are vendor or regional, and some are missing. | Medium | Ranges, estimate labels, and "not quantified" wherever no source exists. |
| Per-building effects are tiny at hex level (a 1,000 m² cool roof is about −0.22 °F air). The map may look unchanged. | High | Roof surface change shown on the building card. Change mode uses its own scale. Cost-versus-effect chart. |
| Scope is larger than the first plan: cost, energy, surface, combined roof, two charts. | High | Cut order below. Deploy early. |
| Mapbox buildings featureset lacks footprints or heights. | High | Spike (Task 21). Fallback: downtown footprint GeoJSON from Analyze Boston. |
| Cooling coefficients are overstated or misapplied. | Medium | Each coefficient cited with its scale and conditions. Upper-bound proxies labelled. |
| Map-load overage or token exposure. | Medium | URL-restricted public token. Map mounted once. |
| Venue wifi fails during the demo. | Medium | Backup demo video (Task 38). Test the deployed URL early. |

**Cut order if behind:** Task 34 (share URL), then Task 33 (before-and-after chart; numbers stay in the cards), then Task 29 (roof markers), then the box-select part of Task 23, then the Change mode part of Task 26 (keep the Air / Surface toggle).

**Never cut:** source labels, the "not quantified" rule, the one-roof rule, or the mid-morning label on surface values.

## Dropped From the Earlier Plan
- Landsat yearly timeline, playback, yearly PNGs, and the timeline UI. A single 2019 surface composite is back (Task 15–18).
- Heat Watch 6am and 7pm values (removed in Task 13b).
- Context layers (canopy, Social Vulnerability Index, parking), per-hex scores, recommendations, the adoption-percentage simulator, per-building scores, the suitability hint, and free-form polygon drawing.
- Cool pavement and depave.
- Time-series charts by year.

## Open Questions
- Task 14: the remaining inputs in the table above.
- Task 21: whether Mapbox's buildings layer returns footprints and heights. Decides Mapbox versus fallback.
- Task 15: whether Landsat 8 uses `lwir11` for the thermal band.
- Mid-morning surface values are shown with a label. Is that acceptable, or should surface be dropped from the metrics? Recommended: keep, labelled.
