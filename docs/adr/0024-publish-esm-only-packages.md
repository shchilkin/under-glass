# Publish ESM-only packages

All packages and CLIs publish ESM with an ES2022 browser target and TypeScript declarations, without a parallel CommonJS build. Node 24, modern bundlers, Deno, and Bun consume the same module graph; avoiding dual output keeps exports, tree shaking, testing, and inter-package identity deterministic for this browser-first component.
