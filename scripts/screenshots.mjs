// Playwright (headless) screenshots for checkpoints: node scripts/screenshots.mjs <outDir> <name:path:width>...
// Example: node scripts/screenshots.mjs docs/screenshots/phase2 home-1440:/:1440 movies-1440:/movies:1440
// Needs the production server on E2E_PORT (default 3061). Writes compressed WebP full-page shots.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const port = process.env.E2E_PORT || 3061;
const [outDir, ...jobs] = process.argv.slice(2);
if (!outDir || jobs.length === 0) {
  console.error("usage: node scripts/screenshots.mjs <outDir> <name:path:width>...");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
for (const job of jobs) {
  const [name, path, width] = job.split(":");
  const context = await browser.newContext({ viewport: { width: Number(width), height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`http://localhost:${port}${path}`, { waitUntil: "load" });
  // Scroll through the page so lazy images load, then return to the top.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);
  const png = await page.screenshot({ fullPage: true });
  await sharp(png).webp({ quality: 80 }).toFile(join(outDir, `${name}.webp`));
  console.log("wrote", join(outDir, `${name}.webp`));
  await context.close();
}
await browser.close();
