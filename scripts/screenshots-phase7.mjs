// Phase 7: portfolio screenshots (docs/portfolio) and UI/UX review-gate screenshots (docs/screenshots/review-gate).
// Needs a production server on E2E_PORT (default 3061). Usage: node scripts/screenshots-phase7.mjs
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const portfolioDir = "docs/portfolio";
const gateDir = "docs/screenshots/review-gate";
const base = `http://localhost:${process.env.E2E_PORT || 3061}`;
const clip = readFileSync(join("public", "media", "hero", "elephants-dream-hero.webm"));
mkdirSync(portfolioDir, { recursive: true });
mkdirSync(gateDir, { recursive: true });

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
async function save(page, dir, name, opts = {}) {
  const png = await page.screenshot(opts);
  await sharp(png).webp({ quality: 80 }).toFile(join(dir, `${name}.webp`));
  console.log("wrote", dir, name);
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
  const p = (name, o) => save(page, portfolioDir, `${name}-${width}`, o);
  await go(page, "/", 3200);
  await p("home-hero");
  await go(page, "/movies");
  await p("movies-browse");
  await go(page, "/movies/sintel");
  await p("movie-details");
  await go(page, "/tv/caminandes");
  await p("series-details");
  await go(page, "/watch/elephants-dream", 800);
  await page.getByTestId("big-play").click();
  await page.waitForFunction(() => { const v = document.querySelector("video"); return v && !v.paused && v.currentTime > 0.5; }, null, { timeout: 20000 });
  await page.getByTestId("player").focus();
  await page.keyboard.press("k");
  await page.getByTestId("player").hover();
  await page.waitForTimeout(900);
  await p("watch-controls");
  await go(page, "/search?q=sin");
  await p("search");
  await go(page, "/trending");
  await p("trending");
  await go(page, "/my-list");
  await p("my-list");
  await ctx.close();
}
for (const width of [240, 390, 768, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await mock(page);
  await go(page, "/", 3200);
  await save(page, gateDir, `home-${width}`, { fullPage: true });
  await go(page, "/movies/sintel");
  await save(page, gateDir, `details-${width}`, { fullPage: true });
  await ctx.close();
}
await browser.close();
