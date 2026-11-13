import { expect, test } from "@playwright/test";

test.describe("mobile menu scroll lock", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("page does not scroll behind the open menu, header stays put, position is kept on close", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 600));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(600);
    const start = await page.evaluate(() => window.scrollY);

    // Raw pointer click at the button's on-screen spot: locator.click() first scrolls the sticky button "into view",
    // which moves the page and is not what a real tap does.
    const box = (await page.getByRole("button", { name: "Open menu" }).boundingBox())!;
    const tap = () => page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await tap();
    await expect(page.locator("#mobile-menu")).toBeVisible();

    await page.mouse.move(195, 600);
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(300);

    const state = await page.evaluate(() => ({
      y: window.scrollY,
      headerTop: document.querySelector("header")!.getBoundingClientRect().top,
    }));
    expect(state.y).toBe(start);
    expect(state.headerTop).toBe(0);

    await tap();
    await expect(page.locator("#mobile-menu")).toBeHidden();
    expect(await page.evaluate(() => window.scrollY)).toBe(start);

    // Scrolling works again once the menu is closed.
    await page.mouse.wheel(0, 400);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(start);
  });
});

test("Short & sweet renders as a runtime list, shortest first, not a carousel", async ({ page }) => {
  await page.goto("/");
  const section = page.locator('section[aria-labelledby="list-short-and-sweet"]');
  await expect(section).toBeVisible();
  await expect(section.locator("[data-rail], [role=region][aria-roledescription=carousel]")).toHaveCount(0);

  const minutes = await section.locator("ol > li").evaluateAll((items) =>
    items.map((li) => Number(li.querySelector(".display")?.firstChild?.textContent ?? NaN)),
  );
  expect(minutes.length).toBeGreaterThan(3);
  expect(minutes.every((m) => Number.isFinite(m) && m <= 15)).toBe(true);
  expect([...minutes].sort((a, b) => a - b)).toEqual(minutes);

  const first = section.locator("ol > li a").first();
  await expect(first).toHaveAttribute("href", /^\/watch\/[a-z0-9-]+$/);
  await first.click();
  await expect(page).toHaveURL(/\/watch\//, { timeout: 30_000 });
});
