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
    environment: "node",
    include: ["apps/**/*.test.ts", "packages/**/*.test.ts"],
  },
});
