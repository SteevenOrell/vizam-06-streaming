// Phase 3 screenshots (headless Chromium): details pages and the watch page with controls visible.
// Needs the production server on E2E_PORT (default 3061) and, for the TV page, the sample build on E2E_SAMPLE_PORT (3062).
// Usage: node scripts/screenshots-phase3.mjs [outDir]
// Wikimedia requests are answered with a local clip so the player can be shown mid-playback without the network.
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const outDir = process.argv[2] || "docs/screenshots/phase3";
const port = process.env.E2E_PORT || 3061;
const samplePort = process.env.E2E_SAMPLE_PORT || 3062;
const movie = process.env.SHOT_MOVIE || "sintel";
const clip = readFileSync(join("public", "media", "hero", "elephants-dream-hero.webm"));
mkdirSync(outDir, { recursive: true });

async function mock(page) {
  await page.route("https://upload.wikimedia.org/**", async (route) => {
    const h = { "content-type": "video/webm", "accept-ranges": "bytes", "access-control-allow-origin": "*" };
    const m = /bytes=(\d+)-(\d*)/.exec(route.request().headers()["range"] ?? "");
    if (m) {
      const s = Number(m[1]);
      const e = Math.min(m[2] ? Number(m[2]) : clip.length - 1, clip.length - 1);
      await route.fulfill({ status: 206, headers: { ...h, "content-range": `bytes ${s}-${e}/${clip.length}`, "content-length": String(e - s + 1) }, body: clip.subarray(s, e + 1) });
    } else await route.fulfill({ status: 200, headers: h, body: clip });
  });
}

async function save(page, name, opts = {}) {
  const png = await page.screenshot(opts);
  await sharp(png).webp({ quality: 80 }).toFile(join(outDir, `${name}.webp`));
  console.log("wrote", join(outDir, `${name}.webp`));
}

const browser = await chromium.launch();
for (const width of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await mock(page);

  await page.goto(`http://localhost:${port}/movies/${movie}`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  await save(page, `movie-details-${width}`, { fullPage: true });

  await page.goto(`http://localhost:${samplePort}/tv/the-quiet-hours`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  await save(page, `tv-details-${width}`, { fullPage: true });

  await page.goto(`http://localhost:${port}/watch/elephants-dream`, { waitUntil: "load" });
  await page.waitForTimeout(800);
  await save(page, `watch-idle-${width}`);
  await page.getByTestId("big-play").click();
  await page.waitForFunction(() => document.querySelector("video") && !document.querySelector("video").paused && document.querySelector("video").currentTime > 0.5, null, { timeout: 20000 });
  await page.keyboard.press("5");
  await page.getByTestId("player").focus();
  await page.keyboard.press("k"); // pause so the control bar stays visible
  await page.getByTestId("player").hover();
  await page.getByTestId("player").locator("video").evaluate((v) => (v.textTracks[0].mode = "showing"));
  await page.waitForTimeout(600);
  await save(page, `watch-controls-${width}`, { fullPage: true });
  await ctx.close();
}
await browser.close();
