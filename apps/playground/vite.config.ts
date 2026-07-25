import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000,
  },
  plugins: [react()],
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
});
