import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.0001,
      threshold: 0.1,
    },
  },
  failOnFlakyTests: isCI,
  forbidOnly: isCI,
  fullyParallel: false,
  reporter: isCI ? [["line"], ["html", { open: "never" }]] : "list",
  retries: isCI ? 1 : 0,
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  testDir: "./tests/browser",
  workers: isCI ? 1 : undefined,
  projects: [
    {
      name: "chromium",
      use: devices["Desktop Chrome"],
    },
    {
      name: "firefox-smoke",
      testMatch: /cross-browser\.spec\.ts/,
      use: devices["Desktop Firefox"],
    },
    {
      name: "webkit-smoke",
      testMatch: /cross-browser\.spec\.ts/,
      use: devices["Desktop Safari"],
    },
  ],
  use: {
    baseURL: "http://127.0.0.1:4185",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    viewport: { width: 1280, height: 800 },
  },
  webServer: [
    {
      command:
        "npm run dev --workspace @under-glass/playground -- --host 127.0.0.1 --port 4185 --strictPort",
      reuseExistingServer: false,
      url: "http://127.0.0.1:4185",
    },
    {
      command:
        "npm run dev --workspace @under-glass/vanilla-example -- --host 127.0.0.1 --port 4186 --strictPort",
      reuseExistingServer: false,
      url: "http://127.0.0.1:4186",
    },
  ],
});
