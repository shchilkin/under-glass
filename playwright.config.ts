import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  use: {
    baseURL: "http://127.0.0.1:4175",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command:
      "npm run dev --workspace @under-glass/playground -- --host 127.0.0.1 --port 4175",
    reuseExistingServer: !process.env.CI,
    url: "http://127.0.0.1:4175",
  },
});
