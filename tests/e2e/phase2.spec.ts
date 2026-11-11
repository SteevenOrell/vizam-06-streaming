import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const hero = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "Featured films" });

test.describe("home hero (motion allowed)", () => {
  test("renders poster first, rotates with controls, no auto-advance", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    const slide1 = hero(page).getByRole("group", { name: /^1 of/ });
    await expect(slide1.locator("img").first()).toBeVisible();
    await expect(slide1.getByRole("heading", { level: 2 })).toBeVisible();
    await expect(slide1.getByRole("link", { name: /Watch Preview/ })).toHaveAttribute("href", /^\/watch\//);
    await expect(slide1.getByRole("link", { name: /View Details/ })).toHaveAttribute("href", /^\/(movies|tv)\//);

    const firstTitle = await slide1.getByRole("heading", { level: 2 }).textContent();
    await page.waitForTimeout(1500);
    await expect(slide1).toHaveAttribute("aria-hidden", "false"); // still on slide 1: auto-advance is off

    await hero(page).getByRole("button", { name: "Next slide" }).click();
    const slide2 = hero(page).getByRole("group", { name: /^2 of/ });
    await expect(slide2).toHaveAttribute("aria-hidden", "false");
    expect(await slide2.getByRole("heading", { level: 2 }).textContent()).not.toBe(firstTitle);
    await hero(page).getByRole("button", { name: "Previous slide" }).click();
    await expect(slide1).toHaveAttribute("aria-hidden", "false");
    await page.keyboard.press("Tab");
  });

  test("background video plays and can be paused", async ({ page }) => {
    await page.goto("/");
    const video = hero(page).locator("video");
    await expect(video).toHaveCount(1);
    await expect(video).toHaveJSProperty("muted", true);
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused), { timeout: 15_000 }).toBe(true);
    await hero(page).getByRole("button", { name: "Pause background video" }).click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await expect(hero(page).getByRole("button", { name: "Play background video" })).toHaveAttribute("aria-pressed", "true");
  });

  test("video pauses when the tab is hidden", async ({ page }) => {
    await page.goto("/");
    const video = hero(page).locator("video");
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused), { timeout: 15_000 }).toBe(true);
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  });
});

test.describe("home hero (reduced motion)", () => {
  test.use({ reducedMotion: "reduce" });
  test("shows the poster and never mounts a video", async ({ page }) => {
    await page.goto("/");
    await expect(hero(page).locator("img").first()).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(hero(page).locator("video")).toHaveCount(0);
    await expect(hero(page).getByRole("button", { name: /background video/ })).toHaveCount(0);
  });
});

test("home rails render and the series rail matches the catalog", async ({ page }) => {
  await page.goto("/");
  for (const name of [/Trending/, /Recently added/, /Popular genres/, /Editor's picks/, /Blender Open Movies/]) {
    await expect(page.getByRole("region", { name }).first()).toBeVisible();
  }
  await expect(page.getByRole("link", { name: /^Animation/ }).first()).toHaveAttribute("href", "/genres#animation");
});

test.describe("movies", () => {
  test("genre filter and sort are driven by the URL", async ({ page }) => {
    await page.goto("/movies");
    const cards = page.getByRole("list", { name: /results|Movies/ }).first().getByRole("listitem");
    const count = page.getByTestId("result-count");
    await expect(count).toContainText("films");
    const total = await cards.count();
    expect(total).toBeGreaterThan(3);

    const animation = page.getByRole("button", { name: "Animation", exact: true });
    await expect(animation).toHaveAttribute("aria-pressed", "false");
    await animation.click();
    await expect(page).toHaveURL(/genre=animation/);
    await expect(animation).toHaveAttribute("aria-pressed", "true");
    const filtered = await cards.count();
    expect(filtered).toBeLessThan(total);
    await expect(count).toHaveText(new RegExp(`^${filtered} film`));

    await page.getByLabel("Sort by").selectOption("az");
    await expect(page).toHaveURL(/sort=az/);
    const names = await cards.locator("p.line-clamp-1.font-semibold").allTextContents();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));

    await page.goBack();
    await expect(page).not.toHaveURL(/sort=az/);
    await expect(page).toHaveURL(/genre=animation/);

    // Deep link restores state
    await page.goto("/movies?decade=1920&sort=oldest");
    await expect(page.getByLabel("Decade")).toHaveValue("1920");
    await expect(page.getByLabel("Sort by")).toHaveValue("oldest");
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("empty result shows a state with a way out", async ({ page }) => {
    await page.goto("/movies?genre=animation&decade=1920");
    await expect(page.getByTestId("no-results")).toBeVisible();
    await page.getByTestId("no-results").getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/movies$/);
    await expect(page.getByTestId("no-results")).toHaveCount(0);
  });

  test("invalid params fall back safely", async ({ page }) => {
    await page.goto("/movies?genre=%3Cscript%3E&sort=evil&decade=abc");
    await expect(page.getByLabel("Sort by")).toHaveValue("newest");
    await expect(page.getByTestId("result-count")).toContainText("films");
  });
});

test("TV shows: empty state or grid, depending on the catalog", async ({ page }) => {
  await page.goto("/tv");
  await expect(page.getByRole("heading", { level: 1, name: "TV Shows" })).toBeVisible();
  const empty = page.getByTestId("empty-state");
  if (await empty.count()) {
    await expect(empty).toContainText("No series yet");
    await expect(empty.getByRole("link", { name: "Browse movies" })).toHaveAttribute("href", "/movies");
  } else {
    await expect(page.getByTestId("result-count")).toContainText("series");
    await expect(page.getByText(/season/).first()).toBeVisible();
  }
});

test("watchlist add/remove persists across reload", async ({ page }) => {
  await page.goto("/");
  const toggle = hero(page).getByRole("group", { name: /^1 of/ }).getByTestId("watchlist-toggle");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(toggle).toContainText("In My List");
  await page.reload();
  await expect(hero(page).getByRole("group", { name: /^1 of/ }).getByTestId("watchlist-toggle")).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => localStorage.getItem("afterlight:my-list"))).toMatch(/^\["[a-z0-9-]+"\]$/);
  await hero(page).getByRole("group", { name: /^1 of/ }).getByTestId("watchlist-toggle").click();
  await page.reload();
  await expect(hero(page).getByRole("group", { name: /^1 of/ }).getByTestId("watchlist-toggle")).toHaveAttribute("aria-pressed", "false");
});

for (const path of ["/", "/movies", "/tv"]) {
  test(`axe: ${path} has no serious violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
}

test("no horizontal scroll from 300 px on home and movies", async ({ page }) => {
  for (const path of ["/", "/movies"]) {
    for (const width of [300, 390, 768]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} @${width}`).toBeLessThanOrEqual(0);
    }
  }
});
