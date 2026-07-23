import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@under-glass/core": fileURLToPath(
        new URL("../../packages/core/src/index.ts", import.meta.url),
      ),
      "@under-glass/three": fileURLToPath(
        new URL("../../packages/three/src/index.ts", import.meta.url),
      ),
    },
  },
});
