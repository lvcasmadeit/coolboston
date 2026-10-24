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
- [x] Task 14: Source the remaining inputs
- [x] Task 15: Landsat 2019 search and asset check
- [x] Task 16: Landsat DN conversion and QA mask
- [x] Task 17: Summer 2019 composite and per-hex mean
- [x] Task 18: Surface field in hexes.json v3

### Phase 4: Selection
- [x] Task 19: Intervention catalog
- [x] Task 20: Geometry helpers
- [x] Task 21: Building selection spike (Mapbox featureset)
- [x] Task 22: Building selection and highlight
- [x] Task 23: Area selection on hexes

### Checkpoint D: After Tasks 14–23
- [x] Tests and build pass
- [x] A building and an area can each be selected and cleared
- [x] Spike decision recorded in this file (Task 21)
- [ ] Review with human before proceeding

### Phase 5: Impact model and map
- [x] Task 24: Hex impact model
- [x] Task 25: Heat-island, energy and cost metrics
- [x] Task 26: Air / Surface base layer and Change mode

### Checkpoint E: After Tasks 24–26
- [x] Tests and build pass
- [x] An action added through a test hook cools its hex on the map
- [ ] Review with human: are effect sizes readable, or does the Change view need more work?

### Phase 6: Act panel and layout
- [x] Task 27: Act panel
- [x] Task 28: Applied actions list
- [x] Task 29: Treated roof markers
- [x] Task 30: Metric cards
- [x] Task 31: Layers tab and top-bar view controls

### Checkpoint F: Core loop complete
- [x] Select building, apply green roof, see the map and metrics change, remove it, see it restore (`e2e/act.spec.ts`)
- [x] Same loop for an area with street trees (`e2e/act.spec.ts`)
- [ ] Deploy the current build now (Task 37) so the URL is known early — deferred by request (2026-10-24); nothing deployed
- [x] Review with human before proceeding (core loop accepted; deploy held)

### Phase 7: Charts
- [x] Task 32: Recharts and cost-versus-effect chart
- [x] Task 33: Before-and-after chart

### Checkpoint G: Charts
- [x] Both charts update with actions and show an empty state with none

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

## Inputs (filled in Task 14)

| Input | Value so far | Source | Status |
|---|---|---|---|
| Green roof installed cost | $10 / $18 / $30 per ft² | New England Metal Roof (2026); HomeGuide; HomeAdvisor | Found. Vendor and consumer sources, low–medium confidence. Central is the midpoint of the cited ranges. |
| Cool roof coating installed cost | $1.50 / $3 / $5 per ft² | New England Metal Roof (2026): coating $0.75–2.50 plus labour $1.50–3.50 | Found. Vendor, medium confidence. |
| Solar installed cost, residential | $3.20 / $3.60 / $4.00 per W | solarpanelsnetwork.com (MA $3.20–3.80/W); poweroutage.us (Boston $3.97–4.02/W) | Residential only. |
| Solar installed cost, commercial rooftop | $2.60 / $3.35 / $4.10 per W (2023 installs, real USD) | LBNL *Tracking the Sun* 2024 brief: state-level medians $2.6–4.1/W for small non-residential (median size 26 kW); large non-residential $1.8–2.6/W. https://eta-publications.lbl.gov/sites/default/files/2024-08/tracking_the_sun_2024_executive_summary.pdf | Found. Range is the spread of state medians, not MA alone; central is the midpoint. Medium confidence. Used for buildings. |
| Green wall installed cost | $95 / $165 / $265 per ft² | designerplants.com; instantjungle budget sheet; illustrarch.com; buildwithrise.com | Found. Mostly indoor systems, low confidence. |
| Street tree planting cost | $300 / $400 / $450 per tree (2007 USD); one tree ≈ 59.5 m² mature crown, so $5.04 / $6.72 / $7.56 per m² of new canopy, or $0.50 / $0.67 / $0.76 per m² of selected ground at +0.10 canopy | USDA Forest Service, *Northeast Community Tree Guide* (PSW-GTR-202, 2007): $400 for a 2-in public tree; worked examples use $300 and $450; 640 ft² (59.5 m²) crown for a 16-in d.b.h. tree. https://www.fs.usda.gov/psw/publications/documents/psw_gtr202/psw_gtr202.pdf | Found. 2007 dollars, not inflated; crown area is the guide's example tree. Low–medium confidence. |
| Solar yield, Massachusetts | 1,320–1,425 kWh per kW per year | NREL PVWatts v8 state average, 4.7 peak-sun-hours × 365 × 0.77–0.83 derate (thegreenwatt.com) | State average. Superseded by the Boston run. |
| Solar yield, Boston | 1,268 / 1,305 / 1,341 kWh AC per kW DC per year | NREL PVWatts v8.5 API (run 2026-10-24): 42.36, −71.06, south, fixed open rack, 14.08% losses, DC/AC 1.2 (Gagnon et al. 2016 Table 1 settings); tilt 15° (flat-roof racking) = 1,268, tilt 30° = 1,341. https://developer.nlr.gov/api/pvwatts/v8.json | Found. TMY weather, not 2019. High confidence. Central is the midpoint. |
| Usable roof share | 0.26 / 0.49 / 0.66 of footprint | Gagnon et al. 2016, NREL/TP-6A20-65298 §4.2: suitable share of roof area for small (<5,000 ft²), medium and large (>25,000 ft²) buildings. https://www.nlr.gov/docs/fy16osti/65298.pdf | Found. Lidar sample of 128 US cities. High confidence. Pick by footprint size. |
| Panel kW per m² of usable roof | 0.112 / 0.126 / 0.140 kW per m² | Gagnon et al. 2016 Table 1: module-to-roof area 0.70 on flat roofs × module power density 160 W/m² (2015 median); their sensitivity case uses 200 W/m². | Found. Central is the midpoint. Medium confidence. |
| Energy per m² per year: cool roof | Cooling saving 3.30 / 5.02 / 7.69 kWh per m² of roof; heating penalty 0.065 therm per m² (national); net bill saving $0.126 / $0.356 / $1.14 per m² | Levinson & Akbari 2010, *Energy Efficiency* 3:53–109, abstract: weathered cool white (0.55) vs gray (0.20) roof on conditioned commercial buildings, 236 US cities; range is the state minimum, national mean and state maximum. https://eta-publications.lbl.gov/publications/potential-benefits-cool-roofs | Found. Massachusetts value not in the abstract; Boston likely sits near the low end. Medium confidence. Their albedo change (0.35) supports the 0.3 assumption below. |
| Energy per m² per year: green roof | $0.18–$0.68 per m² cooling plus $0.22 per m² heating, so $0.40 / $0.65 / $0.90 per m² total (EPA gives $0.15–0.57 and $0.18 per yd²) | EPA "Using Green Roofs to Reduce Heat Islands" (current page, footnote 4). https://www.epa.gov/heatislands/using-green-roofs-reduce-heat-islands | Found as dollars, not kWh; climate and year unstated. Low confidence. Shown as $/yr only. ORNL's 12% figure has no per m² value and is not used. |
| Energy per m² per year: green walls | not quantified | No per m² source found for a temperate climate. | Not quantified. |
| Electricity rate, residential | 30.19¢/kWh, Massachusetts, year to date through June 2026 | EIA *Electric Power Monthly* Table 5.6.B. https://www.eia.gov/electricity/monthly/epm_table_grapher.cfm?t=epmt_5_6_b | Found. Replaces the earlier 29.35¢ palmetto.com figure. High confidence. |
| Electricity rate, commercial | 24.66¢/kWh, Massachusetts, year to date through June 2026 (23.08¢ for the same period of 2025) | EIA *Electric Power Monthly* Table 5.6.B (same URL) | Found. High confidence. Used for buildings. |
| Cool roof air coefficient | −0.61 °C per +0.1 surface albedo, afternoon | Smith et al. 2025, *Communications Earth & Environment* 6:507 | Found. Regional regression, not a per-building test. |
| Green wall area | Outer perimeter × min(height, 10 m) | Assumption (Task 25) | Labelled as an assumption. |
| Roof albedo change for a cool coating | 0.3 | Assumption | Labelled as an assumption until sourced. |
| Tree canopy air coefficient | −0.07 °C per +0.1 canopy fraction | Smith et al. 2025 | Found. |
| Green roof air proxy | up to −5 °F citywide | EPA "Using Green Roofs" (2019 snapshot) | Proxy and upper bound. The current EPA page gives "up to 20 °F nearby", which is not used. |
| Roof surface change | Green roof up to 56 °F lower; cool roof 50–60 °F lower | EPA "Using Green Roofs" and "Using Cool Roofs" | Found. Peak-summer values, not averages. |
| Landsat overpass time | About 10:12 a.m. local solar time (descending) | USGS and NASA | Found. Clock-time conversion for Boston is my arithmetic. |
| Mapbox buildings featureset properties | Numeric `id` (stable, unique per rendered feature), `height` and `min_height` in m, `group: "building-3d"`, Polygon geometry in [lng, lat] | Live probe of `queryRenderedFeatures({target: {featuresetId: "buildings", importId: "basemap"}})` and `addInteraction` clicks, Downtown at zoom 15.2, 2026-10-24 (Task 21) | Verified. See the spike decision below. |
| Landsat thermal asset key | `lwir` on Landsat 7, `lwir11` on Landsat 8; QA band `qa_pixel` on both | Planetary Computer STAC, live items checked 2026-10-24 (Task 15) | Verified. Boston 2019 scenes acquired 15:13–15:27 UTC (about 11:15 a.m. EDT). |

## Spike Decision (Task 21): Mapbox buildings featureset kept

Probed on the live map (Downtown, zoom 15.2, 2,705 rendered buildings):
- `map.addInteraction(id, {type: "click", target: {featuresetId: "buildings", importId: "basemap"}})` fires with `e.feature` for a 210 m tower, a 31 m building part, a 3 m low-rise and a tile-edge building. A plain `click` interaction without a target fires on empty ground.
- Every feature has a numeric id (no nulls, no duplicates among rendered features), `height`, `min_height` and Polygon geometry (5–45 vertices, no holes in the sample).
- `map.setFeatureState(e.feature, {select: true})` highlights the building in the `colorBuildingSelect` config colour. Setting that colour to sage is enough for the highlight; no custom layer is needed.
- Tile edges: 3 of 2,705 buildings touch a tile boundary. For those, the same id exists as a separate piece in the neighbouring tile, and `queryRenderedFeatures` returns only one piece. Their footprint (and so roof area) is underestimated. This affects about 0.1% of buildings and is accepted as a known limitation. Fallback if it matters: union the pieces with the same id found by querying the neighbouring tile.
- `min_height > 0` marks a building part (for example a setback tier). Its footprint is treated as its roof.

Decision: keep Mapbox. The Analyze Boston footprint fallback is not needed.

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
- Mid-morning surface values are shown with a label. Is that acceptable, or should surface be dropped from the metrics? Recommended: keep, labelled.
