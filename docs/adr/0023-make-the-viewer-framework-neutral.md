# Make the Viewer framework-neutral

The canonical browser integration is an imperative ViewerController over the core and Three.js renderer. A custom element and React Viewer are thin adapters over that controller, while the authoring Editor targets React 19; this lets plain HTML, Astro, Vue, Svelte, and other hosts present Visualizations without making Web Component lifecycle or a React peer dependency part of the rendering architecture.
