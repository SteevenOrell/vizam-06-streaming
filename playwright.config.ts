import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT || 3061);
const SAMPLE_PORT = Number(process.env.E2E_SAMPLE_PORT || 3062);

/**
 * E2E runs against the production build (`npm run build` first). Port 3061: 3000/3001 belong to Steeven's servers.
 * Headless Chromium only (several agents may run at once; never the shared browser pane).
 *
 * Two projects:
 *  - chromium: the real catalog on 3061.
 *  - sample:   `*.sample.spec.ts` against a build of the placeholder catalog on 3062 (series with seasons and local
 *              video), so TV flows are tested even while the library has no series. Built by scripts/e2e-sample-server.mjs.
 * Set NEXT_DIST_DIR (e.g. .next-p3) to keep a build out of the shared .next folder.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: 0,
  reporter: [["list"]],
  use: { trace: "retain-on-failure" },
  projects: [
    { name: "chromium", testIgnore: /\.sample\.spec\.ts$/, use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${PORT}` } },
    { name: "sample", testMatch: /\.sample\.spec\.ts$/, use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${SAMPLE_PORT}` } },
  ],
  webServer: [
    {
      command: `npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "node scripts/e2e-sample-server.mjs",
      url: `http://localhost:${SAMPLE_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 360_000,
    },
  ],
});
