import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@under-glass/core": fileURLToPath(
        new URL("./packages/core/src/index.ts", import.meta.url),
      ),
      "@under-glass/three": fileURLToPath(
        new URL("./packages/three/src/index.ts", import.meta.url),
      ),
      "@under-glass/web": fileURLToPath(
        new URL("./packages/web/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    coverage: {
      exclude: ["**/*.test.ts", "**/index.ts"],
      include: [
        "apps/playground/src/popchoice-visualization.ts",
        "packages/core/src/**/*.ts",
        "packages/three/src/**/*.ts",
        "packages/web/src/**/*.ts",
      ],
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "coverage",
      thresholds: {
        branches: 50,
        functions: 50,
        lines: 50,
        statements: 50,
      },
    },
    environment: "node",
    include: ["apps/**/*.test.ts", "packages/**/*.test.ts"],
  },
});
