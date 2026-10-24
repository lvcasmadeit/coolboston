import { expect, test } from "./helpers";

test("cost-vs-effect chart: empty state, one point per action, tooltip with roof surface and cost", async ({ app, page }) => {
  const chart = page.getByRole("figure", { name: "Cost versus effect" });
  await expect(chart).toContainText("Apply an action");

  const b = await app.findBuilding(6, 25);
  await app.clickMap(b.x, b.y);
  await app.panel.getByRole("region", { name: "Cooling actions" }).getByRole("button", { name: /^Green roof\b/ }).first().click();

  const dots = chart.locator(".recharts-scatter-symbol");
  await expect(dots).toHaveCount(1);
  // Cost range bar is drawn (not left mid-animation at scaleX(0)).
  await expect(chart.locator(".recharts-errorBar line").first()).not.toHaveAttribute("style", /scaleX\(0\)/);
  await dots.first().hover();
  await expect(chart).toContainText("Roof surface: −56 °F, peak summer");
  await expect(chart).toContainText(/Capital: \$[\d.]+k–\$[\d.]+k/);

  await page.keyboard.press("Escape"); // no selection: chart shows every action
  await expect(page.getByRole("region", { name: "Impact" })).toContainText("all actions");
  await expect(dots).toHaveCount(1);

  await app.panel.getByRole("region", { name: "Applied actions" }).getByRole("button", { name: "Reset" }).click();
  await expect(chart).toContainText("Apply an action");
});

test("before-and-after chart: empty states, bars move with actions", async ({ app, page }) => {
  const chart = page.getByRole("figure", { name: "Before and after" });
  await expect(chart).toContainText("Select a building or area");

  const b = await app.findBuilding(15, 40);
  await app.clickMap(b.x, b.y);
  await expect(chart).toContainText("Apply an action to this selection");

  const actions = app.panel.getByRole("region", { name: "Cooling actions" });
  await actions.getByRole("button", { name: /^Cool building/ }).click();
  const air = chart.getByLabel(/^Air, 3pm: /);
  await expect(air).toBeVisible();
  const label1 = await air.getAttribute("aria-label");
  await expect(chart.getByLabel(/^Heat island: /)).toBeVisible();
  await expect(chart.locator(".recharts-bar-rectangle")).not.toHaveCount(0);

  // A second action on the same hex (green walls has no cooling, so remove and switch roof)
  await app.panel.getByRole("region", { name: "Applied actions" }).getByRole("button", { name: "Undo" }).click();
  await expect(chart).toContainText("Apply an action to this selection");
  await actions.getByRole("button", { name: /^Green roof\b/ }).first().click();
  await expect.poll(() => chart.getByLabel(/^Air, 3pm: /).getAttribute("aria-label")).not.toBe(label1);
});
