import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@under-glass/core": fileURLToPath(
        new URL("../../packages/core/src/index.ts", import.meta.url),
      ),
      "@under-glass/three": fileURLToPath(
        new URL("../../packages/three/src/index.ts", import.meta.url),
      ),
      "@under-glass/web": fileURLToPath(
        new URL("../../packages/web/src/index.ts", import.meta.url),
      ),
      "@under-glass/test-fixtures": fileURLToPath(
        new URL("../../packages/test-fixtures/src/index.ts", import.meta.url),
      ),
    },
  },
  server: {
    host: "127.0.0.1",
  },
});
