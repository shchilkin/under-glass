# Use Three.js behind thin React bindings

The scene renderer uses Three.js directly, while the graph model and router remain pure TypeScript. `@under-glass/web` supplies the framework-neutral Viewer lifecycle, semantic accessibility layer, and renderer fallback; React supplies thin Viewer bindings plus future Editor UI. Avoiding a React-specific scene renderer keeps GPU resource ownership explicit, preserves the engine boundary, and allows non-React rendering adapters without rewriting scene behavior.
