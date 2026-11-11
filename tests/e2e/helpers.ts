import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Locator, Page } from "@playwright/test";

const CLIP = join(process.cwd(), "public", "media", "hero", "elephants-dream-hero.webm");

/**
 * Serves a short local clip in place of every Wikimedia request (with HTTP range support), so player tests never
 * depend on the network. Wikimedia sources are the only remote video hosts in the catalog.
 */
export async function mockRemoteVideo(page: Page) {
  const body = readFileSync(CLIP);
  await page.route("https://upload.wikimedia.org/**", async (route) => {
    const headers = { "content-type": "video/webm", "accept-ranges": "bytes", "access-control-allow-origin": "*" };
    const range = route.request().headers()["range"];
    const m = range ? /bytes=(\d+)-(\d*)/.exec(range) : null;
    if (m) {
      const start = Number(m[1]);
      const end = Math.min(m[2] ? Number(m[2]) : body.length - 1, body.length - 1);
      await route.fulfill({
        status: 206,
        headers: { ...headers, "content-range": `bytes ${start}-${end}/${body.length}`, "content-length": String(end - start + 1) },
        body: body.subarray(start, end + 1),
      });
    } else {
      await route.fulfill({ status: 200, headers: { ...headers, "content-length": String(body.length) }, body });
    }
  });
}

/** Makes `requestFullscreen` observable without leaving the page in real fullscreen. */
export async function stubFullscreen(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __fs: number }).__fs = 0;
    HTMLElement.prototype.requestFullscreen = function () {
      (window as unknown as { __fs: number }).__fs += 1;
      return Promise.resolve();
    };
  });
}

export const videoEl = (player: Locator) => player.locator("video");
export const isPlaying = (v: Locator) => v.evaluate((el: HTMLVideoElement) => !el.paused && el.currentTime > 0.3 && !el.ended);
export const currentTime = (v: Locator) => v.evaluate((el: HTMLVideoElement) => el.currentTime);

/** Wakes the auto-hiding controls (mouse move over the player). */
export async function reveal(page: Page, player: Locator) {
  const box = await player.boundingBox();
  if (!box) throw new Error("player not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width / 2 + 5, box.y + box.height / 2 + 5);
}
