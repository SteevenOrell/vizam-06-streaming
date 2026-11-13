import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { isPlaying, mockRemoteVideo, stubFullscreen, videoEl } from "./helpers";

/** Phase 6 QA: one route of every type, axe at phone and desktop widths, CSP, headers, keyboard, media gating. */
const ROUTES = [
  "/",
  "/movies",
  "/tv",
  "/genres",
  "/genres/drama",
  "/trending",
  "/search?q=moon",
  "/my-list",
  "/about",
  "/movies/sintel",
  "/tv/caminandes",
  "/watch/sintel",
  "/watch/caminandes?s=1&e=1",
  "/no-such-page",
];

/** Collects CSP violations and console errors from the moment the page starts. */
async function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || /Content Security Policy|Refused to/i.test(m.text())) problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(String(e)));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`));
  });
  return problems;
}

for (const width of [390, 1440]) {
  test.describe(`axe + CSP at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 900 } });
    for (const path of ROUTES) {
      test(`${path}`, async ({ page }) => {
        await mockRemoteVideo(page);
        const problems = await watchConsole(page);
        const res = await page.goto(path);
        expect(res?.status()).toBe(path === "/no-such-page" ? 404 : 200);
        await page.waitForLoadState("networkidle");
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
        // the 404 document request itself is logged as an error by Chromium; that is expected
        expect(problems.filter((p) => !/status of 404/.test(p))).toEqual([]);
      });
    }
  });
}

test("security headers on a production response", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  const csp = h["content-security-policy"];
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("base-uri 'self'");
  expect(csp).toMatch(/media-src 'self' https:\/\/upload\.wikimedia\.org(;|$)/);
  expect(csp).toMatch(/connect-src 'self'(;|$)/);
  expect(csp).toMatch(/img-src 'self' data:(;|$)/);
  expect(csp).not.toContain("unsafe-eval");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["permissions-policy"]).toContain("camera=()");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("JSON-LD is valid JSON and cannot break out of its script tag", async ({ page }) => {
  await page.goto("/movies/sintel");
  const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(raw).not.toMatch(/<\/script/i);
  expect(() => JSON.parse(raw ?? "")).not.toThrow();
});

test("external links open safely", async ({ page }) => {
  for (const path of ["/about", "/movies/sintel", "/watch/sintel"]) {
    await page.goto(path);
    const links = page.locator('a[target="_blank"]');
    const n = await links.count();
    for (let i = 0; i < n; i++) {
      const rel = (await links.nth(i).getAttribute("rel")) ?? "";
      expect(rel, path).toContain("noopener");
      expect(rel, path).toContain("noreferrer");
    }
    const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
    expect(hrefs.filter((h) => /^(javascript:|http:)/i.test(h)), path).toEqual([]);
  }
});

test.describe("hero video gating", () => {
  for (const mode of ["reduced-motion", "save-data"] as const) {
    test(`no hero video request under ${mode}; poster loads`, async ({ page }) => {
      if (mode === "reduced-motion") await page.emulateMedia({ reducedMotion: "reduce" });
      else
        await page.addInitScript(() => {
          Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true, addEventListener() {}, removeEventListener() {} } });
        });
      const videoRequests: string[] = [];
      page.on("request", (r) => {
        if (/\/media\/(hero|previews)\/.*\.(mp4|webm)/.test(r.url())) videoRequests.push(r.url());
      });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);
      expect(videoRequests).toEqual([]);
      const hero = page.locator("section").first();
      await expect(hero.locator("img").first()).toBeVisible();
      expect(await hero.locator("img").first().evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
    });
  }

  test("without restrictions, the poster image is requested before the hero video", async ({ page }) => {
    const order: string[] = [];
    page.on("request", (r) => {
      const u = r.url();
      if (/\/media\/hero\/.*\.(mp4|webm)/.test(u)) order.push("video");
      else if (/_next\/image\?url=%2Fmedia%2F(backdrops|posters)/.test(u) || /\/media\/(backdrops|posters)\//.test(u)) order.push("image");
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(order.length).toBeGreaterThan(0);
    expect(order[0]).toBe("image");
  });
});

test.describe("keyboard only", () => {
  test("skip link, visible focus on the first controls", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.locator(":focus");
    await expect(skip).toHaveText(/skip/i);
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      const outline = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const s = getComputedStyle(el);
        return { tag: el.tagName, outline: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0, shadow: s.boxShadow !== "none" };
      });
      expect(outline.outline || outline.shadow, `focus ring on ${outline.tag}`).toBe(true);
    }
  });

  test("mobile menu by keyboard", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const toggle = page.locator("button[aria-controls=\"mobile-menu\"]");
    await toggle.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("navigation", { name: "Mobile" });
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 15; i++) await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest('nav[aria-label="Mobile"], header'))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  });

  test("search by keyboard: / focuses, typing searches, Enter on a result navigates", async ({ page }) => {
    await page.goto("/search");
    await page.locator("body").press("/");
    await page.keyboard.type("sintel");
    await expect(page).toHaveURL(/q=sintel/);
    let found = false;
    for (let i = 0; i < 25 && !found; i++) {
      await page.keyboard.press("Tab");
      found = await page.evaluate(() => (document.activeElement as HTMLAnchorElement | null)?.getAttribute("href")?.startsWith("/movies/sintel") ?? false);
    }
    expect(found).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/movies\/sintel$/);
  });

  test("season tabs by keyboard", async ({ page }) => {
    await page.goto("/tv/hubblecast");
    const tabs = page.getByRole("tab");
    const n = await tabs.count();
    test.skip(n < 2, "series has a single season");
    await tabs.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  });

  test("player shortcuts", async ({ page }) => {
    await stubFullscreen(page);
    await mockRemoteVideo(page);
    await page.goto("/watch/elephants-dream");
    const player = page.getByTestId("player");
    await page.getByTestId("big-play").focus();
    await page.keyboard.press("Enter");
    const video = videoEl(player);
    await expect.poll(() => isPlaying(video), { timeout: 20_000 }).toBe(true);
    const state = () => video.evaluate((v: HTMLVideoElement) => ({ t: v.currentTime, paused: v.paused, vol: v.volume, muted: v.muted, tracks: [...v.textTracks].map((t) => t.mode) }));
    await player.focus();
    await page.keyboard.press("k");
    await expect.poll(async () => (await state()).paused).toBe(true);
    await page.keyboard.press(" ");
    await expect.poll(async () => (await state()).paused).toBe(false);
    await page.keyboard.press("k");
    await page.keyboard.press("5");
    const t5 = (await state()).t;
    await page.keyboard.press("ArrowRight");
    await expect.poll(async () => (await state()).t).toBeGreaterThan(t5 + 1);
    const t6 = (await state()).t;
    await page.keyboard.press("j");
    await expect.poll(async () => (await state()).t).toBeLessThan(t6 - 1);
    await page.keyboard.press("Home");
    await expect.poll(async () => (await state()).t).toBeLessThan(0.5);
    await page.keyboard.press("End");
    await expect.poll(async () => (await state()).t).toBeGreaterThan(1);
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowDown");
    await expect.poll(async () => (await state()).vol).toBeLessThan(1);
    await page.keyboard.press("ArrowUp");
    await expect.poll(async () => (await state()).vol).toBe(1);
    await page.keyboard.press("m");
    await expect.poll(async () => (await state()).muted).toBe(true);
    await page.keyboard.press("m");
    await page.keyboard.press("c");
    await expect.poll(async () => (await state()).tracks.includes("hidden")).toBe(true);
    await page.keyboard.press("f");
    await expect.poll(() => page.evaluate(() => (window as unknown as { __fs: number }).__fs)).toBe(1);
    // every control in the bar is reachable and shows a focus ring
    let rings = 0;
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const r = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        if (!el.closest('[data-testid="player"]')) return -1;
        const s = getComputedStyle(el);
        return (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none" ? 1 : 0;
      });
      if (r === 0) throw new Error("player control without a visible focus ring");
      if (r === 1) rings++;
    }
    expect(rings).toBeGreaterThan(3);
  });
});
