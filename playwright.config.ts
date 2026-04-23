import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const STORAGE_STATE = path.resolve(__dirname, "e2e/.auth-state.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    // Auth-flow tests that need an unauthenticated browser
    {
      name: "unauthed",
      testMatch: /auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Smoke tests that need a logged-in admin
    {
      name: "chromium",
      testIgnore: /auth\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE_STATE,
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "pnpm dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 60_000 },
});
