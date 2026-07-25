# Under Glass

Under Glass is an open-source toolkit for authoring and presenting interactive three-dimensional visualizations of software projects.

The repository is in its bootstrap stage. The product boundaries and accepted architecture decisions live in [`PRODUCT.md`](./PRODUCT.md) and [`docs/adr`](./docs/adr).

## Packages

- `@under-glass/core`: runtime-neutral Visualization schema and engine primitives;
- `@under-glass/three`: direct Three.js WebGL2 rendering boundary;
- `@under-glass/web`: framework-neutral ViewerController boundary;
- `@under-glass/react`: React 19 adapters and the future Editor;
- `@under-glass/poster`: build-time poster request and CLI boundary;
- `@under-glass/starter-assets`: optional vendor-neutral starter asset catalog;
- `@under-glass/playground`: React integration playground;
- `@under-glass/vanilla-example`: plain TypeScript integration example.

## Development

Under Glass requires Node.js 24 or newer and npm 11.

```sh
npm install
npm run dev
npm run check
npm run test:browser
```

The browser suite includes pinned Chromium visual baselines and repeated
renderer and Editor Session lifecycle gates. See
[`docs/testing/stability-gates.md`](./docs/testing/stability-gates.md) before
updating an intentional visual change.

## Camera motion

The renderer supports two named transitions between isometric and top views:
`responsive` (the default) and `spring`.

```ts
const renderer = createSceneRenderer({
  cameraMotion: "spring",
  container,
  resolveAsset,
  visualization,
});

renderer.setCameraMotion("responsive");
```

Hosts choose a supported motion character rather than supplying arbitrary
durations or easing curves.

## Framework-neutral Viewer

`@under-glass/web` mounts the renderer without requiring React. The host remains
responsible for validating or creating the Visualization and resolving Asset
IDs to definitions and GLB bytes.

```ts
import { parseVisualization } from "@under-glass/core";
import { createViewerController } from "@under-glass/web";

const visualization = parseVisualization(hostJson);
const container = document.querySelector<HTMLElement>("#viewer");

if (container === null) {
  throw new Error("Viewer container was not found.");
}

const controller = createViewerController({
  container,
  resolveAsset: hostAssetResolver,
  visualization,
});

const unsubscribe = controller.subscribe(() => {
  console.log(controller.getSnapshot());
});

controller.setCameraMode("top");
controller.setVisualization(nextVisualization);

unsubscribe();
controller.dispose();
```

See `apps/vanilla-example` for a complete plain TypeScript consumer.
