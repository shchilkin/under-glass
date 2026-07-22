# Use Three.js behind thin React bindings

The scene renderer uses Three.js directly, while the graph model and router remain pure TypeScript and React supplies lifecycle integration, editor UI, Viewer UI, labels, and the semantic accessibility layer. Avoiding a React-specific scene renderer keeps GPU resource ownership explicit, preserves the engine boundary, and allows non-React rendering adapters without rewriting scene behavior.
