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

  const slider = app.panel.getByRole("slider", { name: "Heat slab opacity" });
  await slider.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft"); // 50% -> 30% in 5% steps
  await expect.poll(async () => (await app.tileColor())[3]).toBe(77);
  expect((await app.state()).layers.heat.opacity).toBeCloseTo(0.3, 6);

  await app.panel.getByRole("checkbox", { name: /Treated roofs/ }).click();
  await expect.poll(() => app.deckLayers()).toEqual(["heat-tiles"]);
  await app.panel.getByRole("checkbox", { name: /Heat slab/ }).click();
  await expect.poll(() => app.deckLayers()).toEqual([]);
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

  await app.panel.getByRole("checkbox", { name: /Heat slab/ }).click();
  await app.panel.getByRole("checkbox", { name: /Treated roofs/ }).click();
  await expect.poll(() => app.deckLayers()).toEqual(["heat-tiles", "roof-markers"]);
});
