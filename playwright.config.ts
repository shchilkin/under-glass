import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  failOnFlakyTests: Boolean(process.env.CI),
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  retries: process.env.CI ? 1 : 0,
  testDir: "./tests/browser",
  workers: process.env.CI ? 1 : undefined,
  projects: [
    {
      name: "chromium",
      use: devices["Desktop Chrome"],
    },
  ],
  use: {
    baseURL: "http://127.0.0.1:4175",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command:
      "npm run dev --workspace @under-glass/playground -- --host 127.0.0.1 --port 4175",
    reuseExistingServer: !process.env.CI,
    url: "http://127.0.0.1:4175",
  },
});
