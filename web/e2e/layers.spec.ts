import { expect, test } from "./helpers";

test("top-bar view controls work by keyboard and update the legend", async ({ app, page }) => {
  const temp = page.getByRole("group", { name: "Temperature" });
  const mode = page.getByRole("group", { name: "View mode" });
  const legend = page.getByRole("group", { name: "Heat legend" });

  await temp.getByRole("button", { name: "Surface" }).focus();
  await page.keyboard.press("Enter");
  await expect(temp.getByRole("button", { name: "Surface" })).toHaveAttribute("aria-pressed", "true");
  await expect(legend).toContainText("mid-morning");

  await mode.getByRole("button", { name: "Change" }).focus();
  await page.keyboard.press("Space");
  expect(await app.state()).toMatchObject({ metric: "surface", viewMode: "change" });
  await expect(legend).toContainText("Heat-island reduction (surface)");

  await temp.getByRole("button", { name: "Air" }).click();
  await mode.getByRole("button", { name: "Heat" }).click();
  expect(await app.state()).toMatchObject({ metric: "air", viewMode: "heat" });
  await expect(legend).toContainText("Air temp, 3pm");
});

test("Layers tab: toggles and opacity sliders reach the map", async ({ app, page }) => {
  const b = await app.findBuilding(6, 25);
  await app.clickMap(b.x, b.y);
  await app.panel.getByRole("button", { name: /^Green roof\b/ }).first().click();
  await app.panel.getByRole("tab", { name: "Layers" }).click();

  const slider = app.panel.getByRole("slider", { name: "Heat tiles opacity" });
  await slider.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft"); // 65% -> 45% in 5% steps
  await expect.poll(async () => (await app.heatLayer()).opacity).toBeCloseTo(0.45, 6);
  expect((await app.state()).layers.heat.opacity).toBeCloseTo(0.45, 6);

  await app.panel.getByRole("checkbox", { name: /Treated roofs/ }).click();
  await expect.poll(() => app.deckLayers()).toEqual([]);
  await app.panel.getByRole("checkbox", { name: /Heat tiles/ }).click();
  await expect.poll(async () => (await app.heatLayer()).visible).toBe(false);
  await expect(slider).toBeDisabled();

  const buildings = () =>
    page.evaluate(() =>
      (window as unknown as { __coolboston: { map: { getConfigProperty(i: string, k: string): unknown } } }).__coolboston.map.getConfigProperty(
        "basemap",
        "show3dBuildings",
      ),
    );
  await app.panel.getByRole("checkbox", { name: /3D buildings/ }).click();
  await expect.poll(buildings).toBe(false);
  await app.panel.getByRole("checkbox", { name: /3D buildings/ }).click();
  await expect.poll(buildings).toBe(true);

  await app.panel.getByRole("checkbox", { name: /Heat tiles/ }).click();
  await app.panel.getByRole("checkbox", { name: /Treated roofs/ }).click();
  await expect.poll(() => app.deckLayers()).toEqual(["roof-markers"]);
  expect((await app.heatLayer()).visible).toBe(true);
});

test("heat tiles: flat fill under the buildings; pan and zoom never touch the source", async ({ app, page }) => {
  const info = await page.evaluate(() => {
    const map = (window as unknown as { __coolboston: { map: any } }).__coolboston.map; // eslint-disable-line @typescript-eslint/no-explicit-any
    const src = map.getSource("heat-tiles");
    const w = window as unknown as { __setData: number };
    w.__setData = 0;
    const orig = src.setData.bind(src);
    src.setData = (d: unknown) => (w.__setData++, orig(d));
    const layer = map.getLayer("heat-tiles");
    return { type: layer.type, slot: layer.slot, antialias: map.getPaintProperty("heat-tiles", "fill-antialias") };
  });
  expect(info).toEqual({ type: "fill", slot: "middle", antialias: false });

  const [x, y] = await app.toPage(480, 300);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 120, y - 60, { steps: 5 });
  await page.mouse.up();
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => (window as unknown as { __setData: number }).__setData)).toBe(0);
});
