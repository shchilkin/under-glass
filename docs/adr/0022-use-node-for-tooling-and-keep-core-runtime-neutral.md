# Use Node for tooling and keep core runtime-neutral

Development, CI, published packages, and CLIs require Node 24 or newer, and npm remains the workspace and publishing ecosystem. `packages/core` uses standard ESM and web-platform APIs without Node-specific runtime dependencies so it can later receive Deno and Bun smoke coverage; alternative runtimes are compatibility targets rather than required contributor toolchains. The browser compilation target is independent of this Node tooling baseline.
