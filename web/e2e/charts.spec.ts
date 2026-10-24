import { expect, test } from "./helpers";

test("cost-vs-effect chart: empty state, one point per action, tooltip with roof surface and cost", async ({ app, page }) => {
  const chart = page.getByRole("figure", { name: "Cost versus effect" });
  await expect(chart).toContainText("Apply an action");

  const b = await app.findBuilding(6, 25);
  await app.clickMap(b.x, b.y);
  await app.panel.getByRole("region", { name: "Cooling actions" }).getByRole("button", { name: /^Green roof\b/ }).first().click();

  const dots = chart.locator(".recharts-scatter-symbol");
  await expect(dots).toHaveCount(1);
  await dots.first().hover();
  await expect(chart).toContainText("Roof surface: −56 °F, peak summer");
  await expect(chart).toContainText(/Capital: \$[\d.]+k–\$[\d.]+k/);

  await page.keyboard.press("Escape"); // no selection: chart shows every action
  await expect(page.getByRole("region", { name: "Impact" })).toContainText("all actions");
  await expect(dots).toHaveCount(1);

  await app.panel.getByRole("region", { name: "Applied actions" }).getByRole("button", { name: "Reset" }).click();
  await expect(chart).toContainText("Apply an action");
});
