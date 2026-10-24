import { expect, test as base, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { hasMapboxToken } from "../playwright.config";

/** Mapbox Standard's buildings featureset (see lib/buildings.ts). */
export const BUILDINGS = { featuresetId: "buildings", importId: "basemap" } as const;

/* The browser side is untyped on purpose: these helpers poke mapbox-gl and deck internals. */
/* eslint-disable @typescript-eslint/no-explicit-any */
type W = Window & { __coolboston?: { store: any; map?: any } };

export interface PickedBuilding {
  x: number;
  y: number;
  id: number | string;
  height: number;
}

export class App {
  constructor(readonly page: Page) {}

  /** Right pane: metrics, charts, layers. */
  get panel() {
    return this.page.getByRole("complementary", { name: "Dashboard controls" });
  }

  /** Left pane: interventions to apply, edit mode, applied actions. */
  get actions() {
    return this.page.getByRole("complementary", { name: "Interventions" });
  }

  /** Load the page and wait for the map, its tiles and the coloured heat layer. */
  async open() {
    await this.page.goto("/map");
    await this.page.waitForFunction(() => {
      const map = (window as W).__coolboston?.map;
      return (
        map?.loaded() &&
        map.areTilesLoaded() &&
        map.getLayer("heat-tiles") &&
        map.getFeatureState({ source: "heat-tiles", id: 0 }).color !== undefined
      );
    }, null, { timeout: 60_000 });
    await this.page.waitForTimeout(1000); // let the first interleaved frame settle
  }

  /** Map-local pixel -> page coordinates. */
  async toPage(x: number, y: number): Promise<[number, number]> {
    const box = await this.page.locator(".mapboxgl-map").boundingBox();
    return [box!.x + x, box!.y + y];
  }

  async clickMap(x: number, y: number, { shift = false } = {}) {
    if (shift) await this.page.keyboard.down("Shift");
    await this.page.mouse.click(...(await this.toPage(x, y)));
    if (shift) await this.page.keyboard.up("Shift");
  }

  /** First visible building (top-most at its pixel) whose height is in [minH, maxH]. */
  async findBuilding(minH: number, maxH: number): Promise<PickedBuilding> {
    const found = await this.page.evaluate(
      ([minH, maxH, T]) => {
        const m = (window as W).__coolboston!.map;
        for (let y = 120; y < 450; y += 12)
          for (let x = 250; x < 750; x += 12) {
            const f = m.queryRenderedFeatures([x, y], { target: T })[0];
            const h = f?.properties.height;
            if (f && h >= minH && h <= maxH) return { x, y, id: f.id, height: h };
          }
        return null;
      },
      [minH, maxH, BUILDINGS] as const,
    );
    expect(found, `a building ${minH}-${maxH} m tall in view`).not.toBeNull();
    return found!;
  }

  /** Distinct buildings minH–maxH m tall in view, in scan order (up to `limit`). */
  async findBuildings(minH: number, maxH: number, limit = 40): Promise<PickedBuilding[]> {
    return this.page.evaluate(
      ([minH, maxH, T, limit]) => {
        const m = (window as W).__coolboston!.map;
        const out: { x: number; y: number; id: number | string; height: number }[] = [];
        const seen = new Set<number | string>();
        for (let y = 120; y < 450 && out.length < limit; y += 12)
          for (let x = 250; x < 750 && out.length < limit; x += 12) {
            const f = m.queryRenderedFeatures([x, y], { target: T })[0];
            const h = f?.properties.height;
            if (f && h >= minH && h <= maxH && !seen.has(f.id)) {
              seen.add(f.id);
              out.push({ x, y, id: f.id, height: h });
            }
          }
        return out;
      },
      [minH, maxH, BUILDINGS, limit] as const,
    );
  }

  /** Select a minH–maxH m building whose tile's 3pm air is over `minF` above the citywide mean (heat-island % not n/a). */
  async selectHotBuilding(minH: number, maxH: number, minF = 0.6): Promise<PickedBuilding> {
    const cells: { id: string; temp3pm: number | null }[] = JSON.parse(readFileSync("data/cells.json", "utf8")).cells;
    const air = new Map(cells.map((c) => [c.id, c.temp3pm]));
    const known = cells.flatMap((c) => (c.temp3pm === null ? [] : [c.temp3pm]));
    const mean = known.reduce((a, v) => a + v, 0) / known.length;
    for (const b of await this.findBuildings(minH, maxH)) {
      await this.clickMap(b.x, b.y);
      const sel = (await this.state()).selection;
      const t = sel?.kind === "building" ? air.get(sel.building.primaryTile) : null;
      if (t != null && t - mean > minF) return b;
    }
    throw new Error(`no ${minH}-${maxH} m building in view on a tile more than ${minF} °F above the mean`);
  }

  /** Map pixel of a [lng, lat]. */
  project(lngLat: [number, number]) {
    return this.page.evaluate((ll) => {
      const p = (window as W).__coolboston!.map.project(ll);
      return { x: p.x as number, y: p.y as number };
    }, lngLat);
  }

  centerLng() {
    return this.page.evaluate(() => (window as W).__coolboston!.map.getCenter().lng as number);
  }

  /** Current store state (serialisable subset). */
  state() {
    return this.page.evaluate(() => {
      const s = (window as W).__coolboston!.store.getState();
      return {
        selection: s.selection as
          | null
          | { kind: "building"; building: { id: number | string; primaryTile: string; tiles: { id: string; overlapM2: number }[]; roofAreaM2: number } }
          | { kind: "area"; cells: string[] },
        actions: s.actions.map((a: any) => a.intervention) as string[],
        viewMode: s.viewMode as string,
        layers: s.layers as Record<string, { visible: boolean; opacity: number }>,
      };
    });
  }

  /** Ids of the deck layers currently drawn. */
  deckLayers() {
    return this.page.evaluate(() => (window as W).__coolboston!.map.__deck.props.layers.map((l: any) => l.id) as string[]);
  }

  /** CSS colour (feature state) the heat layer gives tile `cell`, or the first tile with air data. */
  tileColor(cell?: string) {
    return this.page.evaluate((cell) => {
      const map = (window as W).__coolboston!.map;
      const fc = map.getSource("heat-tiles").serialize().data;
      const i = fc.features.findIndex((f: any) => (cell ? f.properties.id === cell : f.properties.temp3pm !== null));
      return map.getFeatureState({ source: "heat-tiles", id: i }).color as string;
    }, cell);
  }

  /** The Mapbox heat fill layer's visibility and opacity. */
  heatLayer() {
    return this.page.evaluate(() => {
      const map = (window as W).__coolboston!.map;
      return {
        visible: map.getLayoutProperty("heat-tiles", "visibility") !== "none",
        opacity: map.getPaintProperty("heat-tiles", "fill-opacity") as number,
      };
    });
  }

  /** Whether building `id` carries the `select` feature state. */
  isHighlighted(id: number | string) {
    return this.page.evaluate(
      ([id, T]) => !!(window as W).__coolboston!.map.getFeatureState({ id, target: T }).select,
      [id, BUILDINGS] as const,
    );
  }
}

/** `test` with an `app` fixture; skips the whole file when no Mapbox token is configured. */
export const test = base.extend<{ app: App }>({
  app: async ({ page }, provide) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    const app = new App(page);
    await app.open();
    await provide(app);
    expect(errors, "no console errors").toEqual([]);
  },
});

test.skip(!hasMapboxToken(), "NEXT_PUBLIC_MAPBOX_TOKEN is not set in web/.env.local; skipping browser tests.");

export { expect };
