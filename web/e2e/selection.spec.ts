import { expect, test } from "./helpers";

// Chinatown, inside the default Downtown view.
const CHINATOWN: [number, number] = [-71.0615, 42.3515];

test("select a building, reselect another, clear with Escape", async ({ app, page }) => {
  const tall = await app.findBuilding(100, 400);
  const low = await app.findBuilding(4, 18);

  await app.clickMap(tall.x, tall.y);
  await expect.poll(() => app.isHighlighted(tall.id)).toBe(true);
  expect((await app.state()).selection).toMatchObject({ kind: "building", building: { id: tall.id } });

  await app.clickMap(low.x, low.y);
  await expect.poll(() => app.isHighlighted(low.id)).toBe(true);
  expect(await app.isHighlighted(tall.id)).toBe(false);

  await page.keyboard.press("Escape");
  await expect.poll(async () => (await app.state()).selection).toBeNull();
  expect(await app.isHighlighted(low.id)).toBe(false);
});

test("area tool: click, shift-click toggle, shift-drag box; plain drag pans", async ({ app, page }) => {
  await page.getByRole("button", { name: "Area" }).click();
  const c = await app.project(CHINATOWN);

  await app.clickMap(c.x, c.y);
  await expect.poll(async () => (await app.state()).selection).toMatchObject({ kind: "area", cells: [expect.any(String)] });

  await app.clickMap(c.x + 60, c.y, { shift: true });
  await expect.poll(async () => (await app.state()).selection).toMatchObject({ cells: { length: 2 } });
  await app.clickMap(c.x + 60, c.y, { shift: true });
  await expect.poll(async () => (await app.state()).selection).toMatchObject({ cells: { length: 1 } });

  const center = () => app.centerLng();
  const before = await center();
  await page.keyboard.down("Shift");
  await page.mouse.move(...(await app.toPage(c.x - 80, c.y - 50)));
  await page.mouse.down();
  await page.mouse.move(...(await app.toPage(c.x + 80, c.y + 40)), { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  const boxed = (await app.state()).selection;
  expect(boxed?.kind === "area" && boxed.cells.length).toBeGreaterThan(1);
  expect(await center(), "box select does not pan").toBe(before);
  expect(await app.deckLayers()).toContain("area-selection");

  await page.mouse.move(...(await app.toPage(500, 300)));
  await page.mouse.down();
  await page.mouse.move(...(await app.toPage(420, 260)), { steps: 8 });
  await page.mouse.up();
  expect(await center(), "plain drag pans").not.toBe(before);

  await page.keyboard.press("Escape");
  await expect.poll(async () => (await app.state()).selection).toBeNull();
});

test("building and area selections replace each other", async ({ app, page }) => {
  const b = await app.findBuilding(10, 60);
  await app.clickMap(b.x, b.y);
  await page.getByRole("button", { name: "Area" }).click();
  const c = await app.project(CHINATOWN);
  await app.clickMap(c.x, c.y);
  await expect.poll(async () => (await app.state()).selection?.kind).toBe("area");
  expect(await app.isHighlighted(b.id)).toBe(false);
});
