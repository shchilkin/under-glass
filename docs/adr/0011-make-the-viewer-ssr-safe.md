# Make the Viewer safe to import during SSR

Importing the Viewer on a server must not access the DOM, `window`, or WebGL. Rendering resources are created only after the client mounts, while server output and the pre-hydration state provide an accessible static shell and a build-generated or host-supplied Poster; this supports Astro and other SSR hosts without requiring the package itself to be hidden behind an unsafe dynamic import.
