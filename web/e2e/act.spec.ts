import { expect, test } from "./helpers";

test("core loop: green roof cools the tile, shows metrics, enforces one roof action, and restores on reset", async ({ app }) => {
  const b = await app.findBuilding(6, 25);
  await app.clickMap(b.x, b.y);
  const sel = (await app.state()).selection;
  if (sel?.kind !== "building") throw new Error("expected a building selection");
  const before = await app.tileColor(sel.building.primaryTile);

  const panel = app.panel;
  await expect(panel.getByRole("region", { name: "Current conditions" })).toContainText("Air, 3pm");
  await app.actions.getByRole("button", { name: /^Green roof\b/ }).first().click();

  expect((await app.state()).actions).toEqual(["green-roof"]);
  expect(await app.tileColor(sel.building.primaryTile)).not.toEqual(before);
  const change = panel.getByRole("region", { name: "Estimated change" });
  await expect(change).toContainText("Air");
  await expect(change).toContainText("Roof surface");
  await expect(change).toContainText("−56 °F");
  expect(await app.deckLayers()).toContain("roof-markers");

  // One roof action per building; green walls stay available.
  await expect(app.actions.getByRole("button", { name: /^Solar panels/ })).toBeDisabled();
  await expect(app.actions.getByRole("button", { name: /^Cool roof/ })).toBeDisabled();
  await expect(app.actions.getByRole("button", { name: /^Green roof \+ solar/ })).toBeDisabled();
  await expect(app.actions.locator("#reason-solar")).toHaveText(/One roof action per building/);
  await expect(app.actions.getByRole("button", { name: /^Green walls/ })).toBeEnabled();

  const list = app.actions.getByRole("region", { name: "Applied actions" });
  await expect(list).toContainText("Applied (1)");
  await expect(list).toContainText("Buildings (1)");
  await expect(list).toContainText("Areas (0)");
  // Every intervention button carries its illustration; the right pane shows the estimated score after.
  await expect(app.actions.getByRole("region", { name: "Cooling actions" }).locator('img[src^="/interventions/"]')).toHaveCount(6);
  await expect(panel.getByRole("region", { name: "Heat Score" })).toContainText("After (est.)");
  await list.getByRole("button", { name: "Reset" }).click();
  expect((await app.state()).actions).toEqual([]);
  expect(await app.tileColor(sel.building.primaryTile)).toEqual(before);
  expect(await app.deckLayers()).not.toContain("roof-markers");
});

test("urban trees on an area; list remove and undo; clicking an item flies to it", async ({ app, page }) => {
  await page.getByRole("button", { name: "Area" }).click();
  const c = await app.project([-71.0615, 42.3515]);
  await app.clickMap(c.x, c.y);
  const panel = app.panel;
  const trees = app.actions.getByRole("region", { name: "Cooling actions" }).getByRole("button", { name: /^Urban trees/ });
  await expect(trees).toContainText("+0.30 canopy");
  await trees.click();
  await trees.click();
  expect((await app.state()).actions).toEqual(["street-trees", "street-trees"]);
  await expect(panel.getByRole("region", { name: "Estimated change" })).toContainText("Heat island");

  const list = app.actions.getByRole("region", { name: "Applied actions" });
  await list.getByRole("button", { name: /^Remove Urban trees/ }).first().click();
  expect((await app.state()).actions).toHaveLength(1);

  await page.keyboard.press("Escape");
  const lng = await app.centerLng();
  await list.getByRole("button", { name: /^Urban trees/ }).click();
  await expect.poll(() => app.centerLng(), { timeout: 5000 }).not.toBe(lng);

  await list.getByRole("button", { name: "Undo" }).click();
  expect((await app.state()).actions).toEqual([]);
  await expect(list).toContainText("No actions yet.");
});
