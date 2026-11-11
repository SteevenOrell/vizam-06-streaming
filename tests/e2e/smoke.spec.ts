import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("home loads with shell, hero and rails", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/AFTERLIGHT/);
  await expect(page.getByRole("link", { name: "AFTERLIGHT home" })).toBeVisible();
  await expect(page.locator("#root")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("contentinfo")).toContainText("concept project");
  expect(errors).toEqual([]);
});

test("desktop nav reaches every section", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const [label, path] of [
    ["Movies", "/movies"],
    ["TV Shows", "/tv"],
    ["Genres", "/genres"],
    ["Trending", "/trending"],
    ["My List", "/my-list"],
  ] as const) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("mobile menu at 390 px: opens, traps focus, closes on Escape; no horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  const toggle = page.getByRole("button", { name: "Open menu" });
  await toggle.click();
  const menu = page.getByRole("navigation", { name: "Mobile" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("link").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();

  await page.getByRole("button", { name: "Open menu" }).click();
  await menu.getByRole("link", { name: "Movies" }).click();
  await expect(page).toHaveURL(/\/movies$/);
  await expect(menu).toBeHidden();
});

test("below 250 px the layout locks at 500 px", async ({ page }) => {
  await page.setViewportSize({ width: 240, height: 700 });
  await page.goto("/");
  const width = await page.locator("#root").evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBe(500);
});

test("home has no serious axe violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});
