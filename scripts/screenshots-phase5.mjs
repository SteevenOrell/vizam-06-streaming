// Phase 5 screenshots (headless Chromium, WebP) of the real catalog.
// Needs the production server on E2E_PORT (default 3061). Usage: node scripts/screenshots-phase5.mjs [outDir]
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const outDir = process.argv[2] || "docs/screenshots/phase5";
const base = `http://localhost:${process.env.E2E_PORT || 3061}`;
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
  console.log("wrote", name);
}
const go = async (page, path, wait = 1800) => {
  await page.goto(base + path, { waitUntil: "load" });
  await page.waitForTimeout(wait);
};

const browser = await chromium.launch();
for (const width of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => localStorage.setItem("afterlight:my-list", JSON.stringify(["sintel", "caminandes", "big-buck-bunny"])));
  const page = await ctx.newPage();
  await mock(page);
  await go(page, "/", 3200);
  await save(page, `home-${width}`, { fullPage: true });
  await go(page, "/movies/sintel");
  await save(page, `movie-details-${width}`, { fullPage: true });
  await go(page, "/tv/caminandes");
  await save(page, `series-details-${width}`, { fullPage: true });
  await go(page, "/watch/elephants-dream", 800);
  await page.getByTestId("big-play").click();
  await page.waitForFunction(() => { const v = document.querySelector("video"); return v && !v.paused && v.currentTime > 0.5; }, null, { timeout: 20000 });
  await page.getByTestId("player").focus();
  await page.keyboard.press("c");
  // The mocked clip is shorter than the film, so real cues never line up: add one long cue to the active track
  // (a layout check of the caption overlay only).
  await page.getByTestId("player").locator("video").evaluate((v) => {
    const t = Array.from(v.textTracks).find((x) => x.mode !== "disabled");
    t?.addCue(new VTTCue(0, 1e6, "Layout check: this caption sits above the control bar."));
  });
  await page.keyboard.press("k");
  await page.getByTestId("player").hover();
  await page.waitForTimeout(900);
  await save(page, `watch-${width}`, { fullPage: true });
  await go(page, "/search?q=sin");
  await save(page, `search-${width}`, { fullPage: true });
  await go(page, "/trending");
  await save(page, `trending-${width}`, { fullPage: true });
  await go(page, "/my-list");
  await save(page, `my-list-${width}`, { fullPage: true });
  await ctx.close();
}
await browser.close();
