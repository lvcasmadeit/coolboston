import { expect, test } from "./helpers";

test("core loop: green roof cools the hex, shows metrics, enforces one roof action, and restores on reset", async ({ app }) => {
  const b = await app.findBuilding(6, 25);
  await app.clickMap(b.x, b.y);
  const sel = (await app.state()).selection;
  if (sel?.kind !== "building") throw new Error("expected a building selection");
  const before = await app.hexColor(sel.building.cell);

  const panel = app.panel;
  await expect(panel.getByRole("region", { name: "Current conditions" })).toContainText("Air, 3pm");
  await panel.getByRole("button", { name: /^Green roof\b/ }).first().click();

  expect((await app.state()).actions).toEqual(["green-roof"]);
  expect(await app.hexColor(sel.building.cell)).not.toEqual(before);
  const change = panel.getByRole("region", { name: "Estimated change" });
  await expect(change).toContainText("Air");
  await expect(change).toContainText("Roof surface");
  await expect(change).toContainText("−56 °F");
  expect(await app.deckLayers()).toContain("roof-markers");

  // One roof action per building; green walls stay available.
  await expect(panel.getByRole("button", { name: /^Solar panels/ })).toBeDisabled();
  await expect(panel.getByRole("button", { name: /^Cool building/ })).toBeDisabled();
  await expect(panel.getByRole("button", { name: /^Green roof \+ solar/ })).toBeDisabled();
  await expect(panel.locator("#reason-solar")).toHaveText(/One roof action per building/);
  await expect(panel.getByRole("button", { name: /^Green walls/ })).toBeEnabled();

  const list = panel.getByRole("region", { name: "Applied actions" });
  await expect(list).toContainText("Applied (1)");
  await list.getByRole("button", { name: "Reset" }).click();
  expect((await app.state()).actions).toEqual([]);
  expect(await app.hexColor(sel.building.cell)).toEqual(before);
  expect(await app.deckLayers()).not.toContain("roof-markers");
});

test("street trees on an area; list remove and undo; clicking an item flies to it", async ({ app, page }) => {
  await page.getByRole("button", { name: "Area" }).click();
  const c = await app.project([-71.0615, 42.3515]);
  await app.clickMap(c.x, c.y);
  const panel = app.panel;
  const trees = panel.getByRole("region", { name: "Cooling actions" }).getByRole("button", { name: /^Street trees/ });
  await expect(trees).toContainText("+0.10 canopy");
  await trees.click();
  await trees.click();
  expect((await app.state()).actions).toEqual(["street-trees", "street-trees"]);
  await expect(panel.getByRole("region", { name: "Estimated change" })).toContainText("Heat island");

  const list = panel.getByRole("region", { name: "Applied actions" });
  await list.getByRole("button", { name: /^Remove Street trees/ }).first().click();
  expect((await app.state()).actions).toHaveLength(1);

  await page.keyboard.press("Escape");
  const lng = await app.centerLng();
  await list.getByRole("button", { name: /^Street trees/ }).click();
  await expect.poll(() => app.centerLng(), { timeout: 5000 }).not.toBe(lng);

  await list.getByRole("button", { name: "Undo" }).click();
  expect((await app.state()).actions).toEqual([]);
  await expect(list).toContainText("No actions yet.");
});
