# Generate Posters in a headless browser

The MVP includes a build-time `render-poster` CLI that mounts the real Viewer in a pinned headless Chromium environment and captures a deterministic PNG or WebP after assets, shaders, labels, and the Opening View have stabilized. Poster generation is cached from the Visualization, Asset Definitions, Scene Theme, viewport, and renderer version; it runs during build or CI rather than per request, preserving visual fidelity without adding a server-side graphics backend.
