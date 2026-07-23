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
- `@under-glass/playground`: integration playground.

## Development

Under Glass requires Node.js 24 or newer and npm 11.

```sh
npm install
npm run dev
npm run check
```

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

The future React Viewer exposes the same choice as its
`cameraMotion="responsive" | "spring"` prop. Hosts choose a supported motion
character rather than supplying arbitrary durations or easing curves.
