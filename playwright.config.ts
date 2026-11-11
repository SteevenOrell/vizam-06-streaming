import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT || 3061);

/**
 * E2E runs against the production build (`npm run build` first). Port 3061: 3000/3001 belong to Steeven's servers.
 * Headless Chromium only (several agents may run at once; never the shared browser pane).
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
