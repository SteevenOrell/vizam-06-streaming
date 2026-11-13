import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PAGES = ["/genres", "/genres/animation", "/trending", "/search?q=sintel", "/my-list", "/about"];

async function noHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
}

test.describe("phase 4 pages", () => {
  for (const path of PAGES) {
    test(`axe: ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (path === "/my-list") await expect(page.getByTestId("my-list-empty")).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });

    for (const width of [300, 390, 768]) {
      test(`no horizontal scroll at ${width}px: ${path}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(await noHorizontalScroll(page)).toBe(true);
      });
    }
  }
});

test.describe("genres", () => {
  test("index tiles link to genre pages with toggle and sort", async ({ page }) => {
    await page.goto("/genres");
    const tiles = page.getByRole("list", { name: "Genres" }).getByRole("link");
    expect(await tiles.count()).toBeGreaterThan(3);
    await page.getByRole("link", { name: /^Animation/ }).click();
    await expect(page).toHaveURL(/\/genres\/animation$/);
    await expect(page.getByRole("heading", { level: 1, name: "Animation" })).toBeVisible();
    const all = page.getByTestId("result-count");
    const countAll = Number((await all.textContent())!.split(" ")[0]);
    expect(countAll).toBeGreaterThan(1);
    await page.getByRole("button", { name: "Series", exact: true }).click();
    await expect(page).toHaveURL(/type=series/);
    await expect(page.getByRole("button", { name: "Series", exact: true })).toHaveAttribute("aria-pressed", "true");
    const countSeries = Number((await all.textContent())!.split(" ")[0]);
    expect(countSeries).toBeLessThan(countAll);
    await page.getByLabel("Sort by").selectOption("az");
    await expect(page).toHaveURL(/sort=az/);
  });

  test("old /genres#slug anchors still land on a tile", async ({ page }) => {
    await page.goto("/genres#animation");
    await expect(page.locator("#animation")).toBeVisible();
  });

  test("unknown genre is a 404", async ({ page }) => {
    const res = await page.goto("/genres/not-a-genre");
    expect(res?.status()).toBe(404);
  });
});

test.describe("trending", () => {
  test("shows the editorial note, numbered ranking and a Rising rail", async ({ page }) => {
    await page.goto("/trending");
    await expect(page.getByTestId("editorial-note")).toContainText("editorial, not audience data");
    const items = page.getByRole("list", { name: /Top \d+ on AFTERLIGHT/ }).getByRole("listitem");
    expect(await items.count()).toBe(10);
    await expect(page.getByRole("link", { name: /^Number 1:/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Rising/ })).toBeVisible();
  });
});

test.describe("search", () => {
  test("typing updates the URL and results; top result and type filter work", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByTestId("search-suggestions")).toBeVisible();
    const input = page.getByRole("searchbox", { name: /Search titles/ });
    await input.fill("sintel");
    await expect(page).toHaveURL(/\?q=sintel/);
    await expect(page.getByTestId("top-result")).toContainText("Sintel");
    await page.getByRole("button", { name: "Series", exact: true }).click();
    await expect(page).toHaveURL(/type=series/);
    await expect(page.getByTestId("no-results")).toBeVisible();
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page.getByTestId("top-result")).toBeVisible();
  });

  test("is accent- and case-insensitive and searches people and synopsis", async ({ page }) => {
    await page.goto("/search?q=SINT%C3%89L");
    await expect(page.getByTestId("top-result")).toContainText("Sintel");
    await page.goto("/search?q=Buster%20Keaton");
    await expect(page.getByTestId("top-result")).toContainText("The General");
  });

  test("no-results state offers suggestions", async ({ page }) => {
    await page.goto("/search?q=zzzxqj");
    await expect(page.getByTestId("no-results")).toBeVisible();
    await expect(page.getByTestId("no-results").getByRole("link", { name: "Trending picks" })).toBeVisible();
    await expect(page.getByTestId("result-count")).toHaveText("0 results");
  });

  test('"/" focuses search from anywhere but not while typing; Escape clears', async ({ page }) => {
    await page.goto("/about");
    await page.keyboard.press("/");
    await expect(page).toHaveURL(/\/search$/);
    const input = page.getByRole("searchbox", { name: /Search titles/ });
    await expect(input).toBeFocused();
    await page.keyboard.type("spri/ng");
    await expect(input).toHaveValue("spri/ng");
    await input.fill("sintel");
    await page.keyboard.press("Escape");
    await expect(input).toHaveValue("");
    await expect(page).not.toHaveURL(/q=/);
    // from a non-input element on /search
    await page.getByRole("heading", { level: 1 }).click();
    await page.keyboard.press("/");
    await expect(input).toBeFocused();
  });

  test("over-long and hostile queries are limited and safe", async ({ page }) => {
    await page.goto(`/search?q=${encodeURIComponent("<img src=x onerror=alert(1)>".repeat(20))}`);
    await expect(page.locator("img[src='x']")).toHaveCount(0);
    expect((await page.getByRole("searchbox").inputValue()).length).toBeLessThanOrEqual(80);
  });
});

test.describe("my list", () => {
  test("add on home, shows on /my-list, remove with undo, persists across reload, syncs live", async ({ page, context }) => {
    await page.goto("/");
    const hero = page.getByTestId("watchlist-toggle").first();
    const label = (await hero.getAttribute("aria-label"))!;
    const title = /(?:Add|Remove) (.+) (?:to|from) My List/.exec(label)![1];
    await hero.click();
    await expect(hero).toHaveAttribute("aria-pressed", "true");

    await page.goto("/my-list");
    const grid = page.getByRole("list", { name: "Saved titles" });
    await expect(grid.getByRole("link", { name: new RegExp(title) }).first()).toBeVisible();
    await expect(page.getByTestId("my-list-count")).toHaveText("1 saved title");

    // live sync from another tab (storage event)
    const other = await context.newPage();
    await other.goto("/movies/big-buck-bunny");
    await other.getByTestId("watchlist-toggle").first().click();
    await expect(page.getByTestId("my-list-count")).toHaveText("2 saved titles");
    await other.close();

    // sort A-Z
    await page.getByLabel("Sort by").selectOption("az");
    const names = await grid.getByRole("link").allTextContents();
    expect(names.length).toBe(2);

    // remove + undo
    await page.getByRole("button", { name: `Remove ${title} from My List` }).click();
    await expect(page.getByTestId("my-list-count")).toHaveText("1 saved title");
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByTestId("my-list-count")).toHaveText("2 saved titles");

    // remove for real, persists across reload
    await page.getByRole("button", { name: `Remove ${title} from My List` }).click();
    await page.reload();
    await expect(page.getByTestId("my-list-count")).toHaveText("1 saved title");
    await expect(grid.getByRole("link", { name: new RegExp(`^${title}`) })).toHaveCount(0);

    // clear all needs confirmation
    await page.getByRole("button", { name: "Clear all" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByTestId("my-list-count")).toHaveText("1 saved title");
    await page.getByRole("button", { name: "Clear all" }).click();
    await page.getByRole("button", { name: "Yes, clear list" }).click();
    await expect(page.getByTestId("my-list-empty")).toBeVisible();
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByTestId("my-list-count")).toHaveText("1 saved title");
  });

  test("ignores garbage in storage", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("afterlight:my-list", "{not json"));
    await page.goto("/my-list");
    await expect(page.getByTestId("my-list-empty")).toBeVisible();
  });
});

test.describe("about", () => {
  test("licence list matches the catalog and is labelled concept", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByText("not a real service", { exact: false }).first()).toBeVisible();
    const licences = await page.getByTestId("licence-item").count();
    // Detail pages are one per title: movies + tv in the sitemap
    const sitemap = await (await page.request.get("/sitemap.xml")).text();
    const titles = (sitemap.match(/<loc>[^<]*\/(?:movies|tv)\/[^<]+<\/loc>/g) ?? []).length;
    expect(licences).toBe(titles);
    expect(licences).toBeGreaterThan(0);
    await expect(page.getByRole("heading", { name: "What we don’t do" })).toBeVisible();
    await page.goto("/about#licences");
    await expect(page.locator("#licences")).toBeVisible();
    await expect(page.getByRole("link", { name: /^CC BY/ }).first()).toHaveAttribute("href", /creativecommons\.org/);
  });

  test("sitemap and robots exist", async ({ page }) => {
    expect((await page.request.get("/robots.txt")).status()).toBe(200);
    const sm = await (await page.request.get("/sitemap.xml")).text();
    for (const p of ["/trending", "/genres", "/search", "/about"]) expect(sm).toContain(p);
    expect(sm).not.toContain("/my-list");
  });
});
