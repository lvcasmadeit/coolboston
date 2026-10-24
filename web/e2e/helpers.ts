import { expect, test as base, type Page } from "@playwright/test";
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

  get panel() {
    return this.page.getByRole("complementary", { name: "Dashboard controls" });
  }

  /** Load the page and wait for the map, its tiles and the coloured heat layer. */
  async open() {
    await this.page.goto("/");
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
          | { kind: "building"; building: { id: number | string; cell: string; roofAreaM2: number } }
          | { kind: "area"; cells: string[] },
        actions: s.actions.map((a: any) => a.intervention) as string[],
        metric: s.metric as string,
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
