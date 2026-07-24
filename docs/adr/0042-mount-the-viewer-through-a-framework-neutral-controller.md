# Mount the Viewer through a framework-neutral controller

`@under-glass/web` exposes `createViewerController()` as the public browser
mount boundary. The host supplies an `HTMLElement`, a validated
`Visualization`, an `AssetResolver`, and an accessibility contract containing
a scene label plus an entity-label resolver; the controller owns the renderer
lifecycle, synchronized semantic summary, renderer-unavailable fallback, and
exposes snapshot subscription, camera controls, Visualization replacement, and
idempotent disposal.

The controller does not fetch assets, persist state, interpret host metadata,
or mutate authored geometry. Replacing a Visualization replaces the internal
renderer while preserving the selected named camera-motion profile. React and
future custom-element adapters should remain thin wrappers over this contract.
The React playground also consumes this controller rather than reaching into
the Three.js renderer directly.

The contract is exercised by `apps/vanilla-example`, a plain TypeScript/Vite
consumer that imports host JSON and mounts the Viewer without React. Shared GLB
fixtures live in the private `@under-glass/test-fixtures` workspace so consumer
apps do not import each other or duplicate binary fixtures.
