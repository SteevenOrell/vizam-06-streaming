import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { currentTime, isPlaying, videoEl } from "./helpers";

// Runs against the sample catalog build (scripts/e2e-sample-server.mjs): a placeholder series with two seasons and a
// local video file, so no network is involved.
const SLUG = "the-quiet-hours";

test.describe("TV show details", () => {
  test("season switch changes the episode list; links point at /watch/<slug>?s=&e=", async ({ page }) => {
    await page.goto(`/tv/${SLUG}`);
    await expect(page.getByRole("heading", { level: 1, name: "The Quiet Hours" })).toBeVisible();
    const tabs = page.getByRole("tablist", { name: "Seasons" });
    await expect(tabs.getByRole("tab", { name: "Season 1" })).toHaveAttribute("aria-selected", "true");
    const eps = page.getByTestId("episode");
    await expect(eps).toHaveCount(3);
    await expect(eps.first()).toContainText("S1 E1");
    await expect(eps.first().getByRole("link")).toHaveAttribute("href", `/watch/${SLUG}?s=1&e=1`);
    // episode without a video is listed but not linked
    await expect(eps.nth(2)).toContainText("not available yet");
    await expect(eps.nth(2).getByRole("link")).toHaveCount(0);

    await tabs.getByRole("tab", { name: "Season 2" }).click();
    await expect(tabs.getByRole("tab", { name: "Season 2" })).toHaveAttribute("aria-selected", "true");
    await expect(eps).toHaveCount(2);
    await expect(eps.first()).toContainText("Return Signal");
    await expect(eps.first().getByRole("link")).toHaveAttribute("href", `/watch/${SLUG}?s=2&e=1`);

    // arrow keys move between tabs (roving tabindex)
    await tabs.getByRole("tab", { name: "Season 2" }).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.getByRole("tab", { name: "Season 1" })).toBeFocused();
    await expect(tabs.getByRole("tab", { name: "Season 1" })).toHaveAttribute("aria-selected", "true");
  });

  test("header, credits, licence and TVSeries structured data", async ({ page }) => {
    await page.goto(`/tv/${SLUG}`);
    await expect(page.getByTestId("meta")).toContainText("2 seasons");
    await expect(page.getByTestId("editorial-rating")).toContainText("7.5/10"); // editorial score only
    await expect(page.getByTestId("credits")).toContainText("Sample Director");
    await expect(page.getByTestId("credits").getByText("Writer", { exact: false })).toHaveCount(0); // empty groups hidden
    await expect(page.getByTestId("licence-panel")).toContainText("About this series");
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");
    expect(ld["@type"]).toBe("TVSeries");
    expect(ld.numberOfSeasons).toBe(2);
    expect(ld.containsSeason[1].episode[0].name).toBe("Return Signal");
    await expect(page.getByTestId("play-link")).toHaveText(/Play S1 E1/);
  });

  test("no axe violations on the series page", async ({ page }) => {
    await page.goto(`/tv/${SLUG}`);
    await page.getByRole("tab", { name: "Season 2" }).click();
    const r = await new AxeBuilder({ page }).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
});

test.describe("episode playback", () => {
  test("plays an episode, shows its details, and Next episode starts the next one", async ({ page }) => {
    await page.goto(`/tv/${SLUG}`);
    await page.getByTestId("episode").first().getByRole("link").click();
    await expect(page).toHaveURL(/\/watch\/the-quiet-hours\?s=1&e=1$/);
    const player = page.getByTestId("player");
    await expect(player).toHaveAttribute("data-state", "idle");
    await expect(page.getByTestId("now-playing")).toContainText("Static");
    await page.getByTestId("big-play").click();
    await expect.poll(() => isPlaying(videoEl(player)), { timeout: 20_000 }).toBe(true);

    // jump to the end: ended overlay with Replay and Next
    await player.focus();
    await page.keyboard.press("End");
    await expect(page.getByTestId("ended")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("ended").getByRole("button", { name: "Replay" })).toBeVisible();

    // E3 of S1 has no video, so "next" after E2 is S2 E1; from E1 the next playable is E2
    await page.getByTestId("ended").getByTestId("next-episode").click();
    await expect(page).toHaveURL(/s=1&e=2$/);
    await expect(page.getByTestId("now-playing")).toContainText("Low Tide");
    // chosen by the visitor (a click), so it starts straight away
    await expect.poll(() => isPlaying(videoEl(page.getByTestId("player"))), { timeout: 20_000 }).toBe(true);
    expect(await currentTime(videoEl(page.getByTestId("player")))).toBeLessThan(5);
  });

  test("episode list on the watch page highlights the current episode; unknown episodes fall back", async ({ page }) => {
    await page.goto(`/watch/${SLUG}?s=2&e=2`);
    await expect(page.getByTestId("episode").filter({ has: page.locator('[aria-current="true"]') })).toHaveCount(0);
    await expect(page.locator('li[aria-current="true"]')).toContainText("Lamp Room");
    await expect(page.getByTestId("now-playing")).toContainText("Lamp Room");
    await page.goto(`/watch/${SLUG}?s=9&e=9`);
    await expect(page.getByTestId("no-video")).toContainText("not available");
  });

  test("watch page with an episode has no axe violations", async ({ page }) => {
    await page.goto(`/watch/${SLUG}?s=1&e=2`);
    await expect(page.getByTestId("big-play")).toBeVisible();
    const r = await new AxeBuilder({ page }).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
});
