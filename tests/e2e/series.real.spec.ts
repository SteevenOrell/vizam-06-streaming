import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { isPlaying, mockRemoteVideo, videoEl } from "./helpers";

// The four real series from the media library. Expectations are read from the library itself, so adding an episode
// there does not break the test. Wikimedia is mocked with a local clip (no network).
type Ep = { number: number; title: string; still?: string; videos?: unknown[] };
type Item = { slug: string; type: string; title: string; seasons?: { number: number; episodes: Ep[] }[] };
const lib = JSON.parse(readFileSync("content/media-library.json", "utf8"));
const series = ((lib.items ?? lib) as Item[]).filter((i) => i.type === "series" && i.seasons?.length);

test.describe("real series", () => {
  test("the library has series", () => {
    expect(series.length).toBeGreaterThanOrEqual(4);
  });

  for (const s of series) {
    test(`${s.slug}: details, stills, play link and playback`, async ({ page }) => {
      await mockRemoteVideo(page);
      const season = s.seasons![0];
      await page.goto(`/tv/${s.slug}`);
      await expect(page.getByRole("heading", { level: 1, name: s.title })).toBeVisible();
      const eps = page.getByTestId("episode");
      await expect(eps).toHaveCount(season.episodes.length);
      // Every episode still renders as a real (non-broken) image.
      await page.waitForLoadState("networkidle");
      const broken = await page.locator('[data-testid="episode"] img').evaluateAll((imgs) => (imgs as HTMLImageElement[]).filter((i) => !i.complete || i.naturalWidth === 0).length);
      expect(broken).toBe(0);
      const first = season.episodes.find((e) => e.videos?.length) ?? season.episodes[0];
      await expect(page.getByTestId("play-link")).toHaveAttribute("href", /\/watch\/.+\?s=\d+&e=\d+/);

      await page.goto(`/watch/${s.slug}?s=${season.number}&e=${first.number}`);
      const player = page.getByTestId("player");
      await expect(player).toHaveAttribute("data-state", "idle");
      await expect(page.getByRole("heading", { name: first.title }).first()).toBeVisible();
      await page.getByTestId("big-play").click();
      await expect.poll(() => isPlaying(videoEl(player)), { timeout: 20_000 }).toBe(true);
    });
  }
});
