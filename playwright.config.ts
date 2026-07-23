import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  failOnFlakyTests: isCI,
  forbidOnly: isCI,
  fullyParallel: false,
  reporter: isCI ? [["line"], ["html", { open: "never" }]] : "list",
  retries: isCI ? 1 : 0,
  testDir: "./tests/browser",
  workers: isCI ? 1 : undefined,
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
    reuseExistingServer: !isCI,
    url: "http://127.0.0.1:4175",
  },
});
