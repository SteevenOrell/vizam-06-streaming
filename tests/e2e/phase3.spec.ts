import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { currentTime, isPlaying, mockRemoteVideo, reveal, stubFullscreen, videoEl } from "./helpers";

const MOVIE = "elephants-dream"; // has captions and a Wikimedia source (mocked with a local clip in these tests)

async function startPlayer(page: Page, slug = MOVIE) {
  await mockRemoteVideo(page);
  await page.goto(`/watch/${slug}`);
  const player = page.getByTestId("player");
  await expect(player).toHaveAttribute("data-state", "idle");
  await page.getByTestId("big-play").click();
  const video = videoEl(player);
  await expect.poll(() => isPlaying(video), { timeout: 20_000 }).toBe(true);
  return { player, video };
}

test.describe("movie details", () => {
  test("renders header, credits, licence panel, structured data and related titles", async ({ page }) => {
    await page.goto("/movies/sintel");
    await expect(page.getByRole("heading", { level: 1, name: "Sintel" })).toBeVisible();
    await expect(page.getByTestId("licence-badge")).toContainText("CC BY 3.0");
    await expect(page.getByTestId("meta")).toContainText("2010");
    await expect(page.getByRole("list", { name: "Genres" }).getByRole("link").first()).toBeVisible();
    await expect(page.getByTestId("play-link")).toHaveAttribute("href", "/watch/sintel");
    await expect(page.getByTestId("watchlist-toggle")).toBeVisible();
    // no invented ratings when the source is "none"
    await expect(page.getByTestId("editorial-rating")).toHaveCount(0);

    const credits = page.getByTestId("credits");
    await expect(credits.getByText("Director", { exact: true })).toBeVisible();
    await expect(credits.getByText("Cast", { exact: true })).toBeVisible();
    await expect(credits.getByText("Writer", { exact: true })).toBeVisible();
    await expect(credits).toContainText("Colin Levy");

    const licence = page.getByTestId("licence-panel");
    await expect(licence).toContainText("Blender Foundation");
    for (const link of await licence.getByRole("link").all()) {
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("href", /^https:\/\//);
    }

    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");
    expect(ld["@type"]).toBe("Movie");
    expect(ld.name).toBe("Sintel");
    expect(ld.duration).toBe("PT15M");
    expect(ld.director[0].name).toBe("Colin Levy");
    expect(ld).not.toHaveProperty("aggregateRating");

    await expect(page.getByRole("region", { name: "You might also like" })).toBeVisible();
  });

  test("Play goes to the watch page and My List toggles", async ({ page }) => {
    await page.goto("/movies/sintel");
    await page.getByTestId("watchlist-toggle").click();
    await expect(page.getByTestId("watchlist-toggle")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("play-link").click();
    await expect(page).toHaveURL(/\/watch\/sintel$/);
    await expect(page.getByTestId("player")).toBeVisible();
  });

  test("has no axe violations and no horizontal scroll at 390 px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/movies/sintel");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});

test.describe("watch page and player", () => {
  test("click to play, pause, seek by keyboard, mute, volume memory", async ({ page }) => {
    const { player, video } = await startPlayer(page);
    await expect(player).toHaveAttribute("data-state", "playing");
    await expect(video).toHaveJSProperty("muted", false); // never autoplays with sound unless the visitor clicked

    await reveal(page, player);
    await page.getByTestId("play-pause").click();
    await expect(player).toHaveAttribute("data-state", "paused");
    await expect(video).toHaveJSProperty("paused", true);

    // keyboard: K toggles, arrows seek 5 s
    await player.focus();
    await page.keyboard.press("k");
    await expect(video).toHaveJSProperty("paused", false);
    await page.keyboard.press("k");
    await expect(video).toHaveJSProperty("paused", true);
    const t0 = await currentTime(video);
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => currentTime(video)).toBeGreaterThan(t0 + 4.5);
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => currentTime(video)).toBeLessThan(t0 + 1);
    await page.keyboard.press("5");
    const dur = await video.evaluate((v: HTMLVideoElement) => v.duration);
    await expect.poll(() => currentTime(video)).toBeCloseTo(dur / 2, 0);
    await page.keyboard.press("Home");
    await expect.poll(() => currentTime(video)).toBeLessThan(0.5);

    // seek bar exposes readable value text
    await expect(page.getByTestId("seek")).toHaveAttribute("aria-valuetext", /^\d+:\d\d of \d+:\d\d$/);

    // mute (button and M key) and persisted volume
    await reveal(page, player);
    await page.getByTestId("mute").click();
    await expect(video).toHaveJSProperty("muted", true);
    await expect(page.getByTestId("mute")).toHaveAttribute("aria-pressed", "true");
    await player.focus();
    await page.keyboard.press("m");
    await expect(video).toHaveJSProperty("muted", false);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    const vol = await video.evaluate((v: HTMLVideoElement) => v.volume);
    expect(vol).toBeCloseTo(0.9, 1);
    await page.reload();
    await page.getByTestId("big-play").click();
    await expect.poll(() => videoEl(page.getByTestId("player")).evaluate((v: HTMLVideoElement) => v.volume)).toBeCloseTo(0.9, 1);
  });

  test("captions: menu and C key set exactly one text track showing", async ({ page }) => {
    const { player, video } = await startPlayer(page);
    const modes = () => video.evaluate((v: HTMLVideoElement) => Array.from(v.textTracks).map((t) => t.mode));
    expect(await modes()).toEqual(["disabled"]); // off by default
    await reveal(page, player);
    await page.getByTestId("cc").click();
    await page.getByRole("button", { name: "English" }).click();
    expect(await modes()).toEqual(["showing"]);
    await page.getByRole("button", { name: "Off" }).click();
    expect(await modes()).toEqual(["disabled"]);
    await page.keyboard.press("Escape");
    await player.focus();
    await page.keyboard.press("c");
    expect(await modes()).toEqual(["showing"]);
  });

  test("fullscreen button and F key call requestFullscreen", async ({ page }) => {
    await stubFullscreen(page);
    const { player } = await startPlayer(page);
    await reveal(page, player);
    await page.getByTestId("fullscreen").click();
    expect(await page.evaluate(() => (window as unknown as { __fs: number }).__fs)).toBe(1);
    await player.focus();
    await page.keyboard.press("f");
    expect(await page.evaluate(() => (window as unknown as { __fs: number }).__fs)).toBe(2);
  });

  test("data saver switches to the smaller source and keeps playing", async ({ page }) => {
    const { player, video } = await startPlayer(page);
    expect(await video.evaluate((v: HTMLVideoElement) => v.currentSrc)).toContain("1080p");
    await reveal(page, player);
    await page.getByTestId("settings").click();
    await page.getByTestId("data-saver").click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentSrc)).toContain("480p");
    await expect.poll(() => isPlaying(video), { timeout: 15_000 }).toBe(true);
  });

  test("controls hide while playing, reappear on movement and stay while keyboard-focused", async ({ page }) => {
    const { player } = await startPlayer(page);
    const controls = page.getByTestId("controls");
    await reveal(page, player);
    await expect(controls).toHaveCSS("opacity", "1");
    await expect(controls).toHaveCSS("opacity", "0", { timeout: 8000 });
    await reveal(page, player);
    await expect(controls).toHaveCSS("opacity", "1");
    // keyboard focus pins them
    await page.mouse.move(2, 2);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(4000);
    await expect(controls).toHaveCSS("opacity", "1");
  });

  test("resume prompt: offers the saved position, then Start over", async ({ page }) => {
    await page.addInitScript(
      ([slug]) => localStorage.setItem("afterlight:resume", JSON.stringify({ [slug]: { t: 6, d: 888, at: Date.now() } })),
      [MOVIE],
    );
    await mockRemoteVideo(page);
    await page.goto(`/watch/${MOVIE}`);
    await expect(page.getByTestId("resume")).toHaveText("Resume from 0:06");
    await page.getByTestId("resume").click();
    const video = videoEl(page.getByTestId("player"));
    await expect.poll(() => currentTime(video), { timeout: 20_000 }).toBeGreaterThanOrEqual(6);
    await page.reload();
    await page.getByTestId("start-over").click();
    await expect.poll(() => isPlaying(videoEl(page.getByTestId("player"))), { timeout: 20_000 }).toBe(true);
    expect(await currentTime(videoEl(page.getByTestId("player")))).toBeLessThan(5);
  });

  test("a broken source shows the error state with retry and a link back", async ({ page }) => {
    await page.route("https://upload.wikimedia.org/**", (route) => route.abort());
    await page.goto(`/watch/${MOVIE}`);
    await page.getByTestId("big-play").click();
    const error = page.getByTestId("player-error");
    await expect(error).toBeVisible({ timeout: 20_000 });
    await expect(error).toHaveAttribute("role", "alert");
    await expect(error.getByRole("link", { name: "Back to details" })).toHaveAttribute("href", `/movies/${MOVIE}`);
    const source = error.getByRole("link", { name: /Open source page/ });
    await expect(source).toHaveAttribute("rel", "noopener noreferrer");
    // network recovers: Try again plays
    await page.unroute("https://upload.wikimedia.org/**");
    await mockRemoteVideo(page);
    await error.getByRole("button", { name: "Try again" }).click();
    await expect.poll(() => isPlaying(videoEl(page.getByTestId("player"))), { timeout: 20_000 }).toBe(true);
    await expect(page.getByTestId("player-error")).toHaveCount(0);
  });

  test("details panel shows poster, genres, credits and the licence line", async ({ page }) => {
    await page.goto(`/watch/${MOVIE}`);
    const info = page.getByTestId("watch-info");
    await expect(info.getByRole("heading", { level: 2 })).toContainText("Elephants Dream");
    await expect(info.getByRole("list", { name: "Genres" })).toBeVisible();
    await expect(info).toContainText("Director:");
    await expect(page.getByTestId("watch-attribution")).toContainText("CC BY");
  });

  test("no axe violations idle and while playing, no horizontal scroll at 390 px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockRemoteVideo(page);
    await page.goto(`/watch/${MOVIE}`);
    await expect(page.getByTestId("big-play")).toBeVisible();
    const idle = await new AxeBuilder({ page }).analyze();
    expect(idle.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    await page.getByTestId("big-play").click();
    await expect.poll(() => isPlaying(videoEl(page.getByTestId("player"))), { timeout: 20_000 }).toBe(true);
    await reveal(page, page.getByTestId("player"));
    await page.getByTestId("cc").click(); // open a menu so the popover is covered too
    const playing = await new AxeBuilder({ page }).analyze();
    expect(playing.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("titles without a trailer show no trailer button", async ({ page }) => {
    await page.goto("/movies/sintel");
    await expect(page.getByTestId("trailer-link")).toHaveCount(0);
  });

  // Real network: run with E2E_NETWORK=1 (or --grep @network). Not part of CI-critical runs.
  test("@network plays a real Wikimedia source", async ({ page }) => {
    test.skip(!process.env.E2E_NETWORK, "set E2E_NETWORK=1 to hit the real Wikimedia host");
    test.setTimeout(90_000);
    await page.goto("/watch/big-buck-bunny");
    await page.getByTestId("big-play").click();
    const video = videoEl(page.getByTestId("player"));
    await expect.poll(() => isPlaying(video), { timeout: 60_000 }).toBe(true);
    expect(await video.evaluate((v: HTMLVideoElement) => v.currentSrc)).toContain("upload.wikimedia.org");
  });
});
