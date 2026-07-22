import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  clean: true,
  dts: true,
  format: ["esm"],
  platform: "browser",
  sourcemap: true,
  target: "es2022",
});
