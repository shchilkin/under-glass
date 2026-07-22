# 3D Project Visualization Component

## Product

An open-source component for authoring and presenting interactive three-dimensional visualizations of projects. A host application owns a generic graph and its meaning; the component owns spatial presentation, editing interactions, deterministic routing, and accessible exploration.

The product is not a clone or fork of Isoflow. It uses real glTF/GLB assets, one shared Ground Plane layout, and two canonical camera modes: orthographic isometric and top. Free camera movement and general-purpose XYZ editing are outside the product boundary.

## Architecture

The npm-workspaces repository contains:

- `packages/core`: versioned schema, validation and migrations, Operations, session undo/redo, placement, collision detection, and routing;
- `packages/three`: direct Three.js WebGL2 rendering and 3D asset runtime;
- `packages/web`: the framework-neutral ViewerController, labels, the semantic accessibility layer, and an optional custom element adapter;
- `packages/react`: the controlled React 19 Editor and thin Viewer adapter;
- `apps/playground`: the integration demo;
- a build-time `render-poster` CLI that captures the real Viewer in pinned headless Chromium.

The host is the source of truth. It passes a validated Visualization and receives the next snapshot plus the completed Operation. Persistence, authentication, collaboration, and durable history remain outside the component.

## Toolchain

The repository uses Node 24 or newer with npm workspaces. Packages are written against TypeScript 7, published as ESM with an ES2022 browser target, and built with `tsdown`; declaration generation uses `isolatedDeclarations` so it does not depend on the removed TypeScript 7 compiler API. Vite 8 powers the playground and Editor development environment. A TypeScript 6 compatibility package may be installed temporarily for third-party development tools that still require the legacy compiler API, but it is not the project's type-checker.

Vitest covers pure schema, migration, Operation, placement, collision, and deterministic routing behavior. Playwright exercises the published browser boundaries against the real Viewer and Editor: WebGL rendering, keyboard and pointer interaction, the semantic accessibility layer, the custom element, the React adapter, export, and stable visual fixtures. Chromium is the required rendering baseline; other supported engines receive focused compatibility smoke coverage where WebGL behavior permits it.

## Visualization model

A Visualization is a versioned, host-owned generic multigraph with stable opaque IDs:

- a labelled Node references an Asset ID, has continuous X/Z coordinates, a quarter-turn orientation, optional host metadata, an optional Style Key, and optional Source Reference;
- a Group has explicit member Nodes and saved bounds on the Ground Plane; Groups do not nest, collapse, or act as Connection endpoints in the MVP;
- a labelled Connection joins two Nodes, may be undirected, one-way, or bidirectional, and multiple independent Connections may join the same pair;
- an Opening View stores the initial camera mode, quarter-turn scene orientation, and framing;
- a Scene Theme resolves semantic Style Keys without replacing materials authored into a 3D Asset.

The schema carries `schemaVersion`. Zod 4 is the source of truth for persisted data types and runtime structural validation, and the project publishes generated JSON Schema for hosts and external tooling. Persisted schemas avoid transforms, non-JSON values, and opaque refinements that cannot be represented faithfully in JSON Schema. Cross-reference and domain invariants, such as a Connection naming existing Nodes, are checked by a separate semantic validator.

Supported old versions migrate through explicit pure steps from one version to the next, with validation at their boundaries, before entering the engine. Invalid data or unknown future versions produce structured diagnostics and never partially render or receive silent repairs.

## Assets

The host resolves stable Asset IDs to Asset Definitions. An Asset Definition references a glTF/GLB 3D Asset and records normalized scale, orientation, ground contact, footprint, and named Connection Ports. Import derives initial values without modifying the source file, and the author may override them.

If an asset cannot be resolved or loaded, its Node uses an Asset Placeholder while preserving the label, footprint, metadata, and Connections. The component reports the error without failing the rest of the scene.

The project ships an optional, separately consumable starter pack of original generic assets. Its visual language uses recognizable isometric infrastructure miniatures with distinct silhouettes, consistent scale, restrained detail, and no cloud-vendor branding. Asset names suggest common uses but do not add domain semantics to Nodes; the host and Node label remain authoritative. The pack avoids both anonymous geometric primitives and highly literal vendor-specific hardware replicas.

The first pack contains twelve Asset Definitions: `user`, `browser`, `mobile-device`, `service`, `gateway`, `server`, `worker`, `database`, `cache`, `queue`, `object-storage`, and `external-system`. Groups represent zones such as networks, clusters, environments, and bounded contexts rather than adding those concepts as Nodes. Monitoring, identity, repository, and function assets are candidates for a later pack after the first scene validates the visual language.

Runtime code is intended for the MIT license; every bundled or user-supplied asset retains separate license and provenance information.

## Placement and Groups

Nodes and Groups are authored on the horizontal X/Z Ground Plane. Vertical position is derived from the asset and supporting surface. Coordinates remain continuous; Editor grid snapping is configurable and does not change the saved coordinate model. Node footprints prevent overlapping placement.

A Node references Group membership explicitly. Dropping a Node into a Group updates that membership. Moving a Group moves its Nodes. Group bounds expand to contain member Nodes with padding, never shrink automatically, and may be resized by the author no smaller than their occupied area.

## Connections and routing

Connections follow orthogonal routes on the Ground Plane with entry segments at their Nodes. Each endpoint may reference an optional `portId`. When it is absent, the router chooses a suitable side deterministically; when it is present, that port is a hard endpoint constraint.

Starter assets expose `front`, `right`, `back`, and `left` ports in asset-local coordinates, which rotate with the Node. Multiple Connections may share a port and receive stable separated lanes. Custom assets may declare any number of named ports, including semantic names such as `input`, `output`, or `admin`. A Connection referencing a missing port produces a structured diagnostic rather than silently selecting another port. Assets without declared ports receive derived footprint-side ports.

The router is deterministic:

- it builds a sparse orthogonal routing graph from obstacle boundaries, ports, and Route Anchors, then finds a weighted path with A*;
- Node footprints and Group bounds are hard obstacles;
- other routes are soft obstacles with a high crossing cost;
- unavoidable crossings use deterministic 3D overpasses;
- parallel Connections use stable separated lanes;
- fully automatic routes may recalculate as the scene changes;
- user-created Route Anchors are immutable constraints;
- only affected segments between the nearest anchors recalculate;
- an impossible constrained route becomes an explicit Route Conflict rather than silently moving an anchor.

The MVP router has no external layout or routing-engine dependency. Within the supported performance envelope it begins with simple deterministic obstacle queries; a spatial index is introduced only when profiling demonstrates a need and must not change route identity.

## Camera, labels, and presentation

Isometric and top modes use the same coordinates and Connection Routes. The scene can rotate in 90-degree steps; both modes support pan and zoom. Nodes rotate in 90-degree steps with their footprints and ports.

Node labels face the screen, avoid collisions, and use zoom-based visibility; a selected Node label remains visible. The Viewer opens at the author-defined Opening View. Visitor pan and zoom are transient.

Original PBR materials remain authoritative. Lighting, Ground Plane, labels, Groups, Connections, hover, selection, dimming, and optional tint come from the Scene Theme.

## Editor and Viewer

The headless engine owns graph operations, selection, placement, routing, and session undo/redo. Its small framework-neutral controller/store exposes snapshots, subscriptions, and Operation dispatch without Redux, Zustand, or another external state manager. The host-owned Visualization remains the only persisted state; hover, drag previews, and other incomplete gestures are transient controller state. React subscribes through `useSyncExternalStore`.

A framework-neutral ViewerController provides read-only exploration to plain HTML and non-React frameworks. An optional custom element and the React Viewer are thin adapters over that controller; the React 19 Editor provides the standard authoring interface.

Every completed authoring gesture emits one reversible Operation. A drag is one Operation from start to drop, not a stream of persisted pointer movements. Undo/redo is session-local. A future host may persist Operations to present system evolution, but persistent history is not part of the MVP.

The WebGL canvas has a synchronized semantic representation of Nodes, Groups, and Connections. Focus, selection, navigation, movement, and connection authoring are available to keyboard users and assistive technology.

The Viewer is responsive and touch-friendly from small mobile widths. Full authoring is supported on desktop and tablets from approximately 1024 px; phones receive the Viewer rather than a compressed editing experience.

## SSR, fallback, and export

Importing the Viewer during SSR does not access the DOM, `window`, or WebGL. Browser rendering resources are created only after mount.

The build-time poster tool mounts the actual Viewer in pinned headless Chromium and generates deterministic PNG or WebP output after assets, shaders, labels, and camera framing stabilize. Posters are cached from the Visualization, assets, theme, viewport, and renderer version. They serve as pre-hydration and no-WebGL fallback, and can also be used for social previews and documentation.

The MVP supports full JSON round-trip and PNG export of the current view. The component returns data or a Blob; the host owns downloading and storage. SVG and PDF export are outside the MVP.

## Performance envelope

The supported MVP target on a modern laptop is:

- up to 200 Nodes;
- up to 400 Connections;
- up to 30 Groups;
- approximately 1 million visible triangles.

Larger scenes may work, but the component reports asset and renderer diagnostics rather than promising stable 60 FPS beyond this envelope.

## First vertical slice

The first end-to-end slice is complete when the playground can:

1. load the starter pack and one external GLB through an Asset Definition;
2. add, label, move, and rotate several Nodes;
3. create one Group;
4. connect Nodes with automatic grounded orthogonal routes;
5. add a Route Anchor and expose a Route Conflict;
6. switch between isometric and top modes over the same layout;
7. pass the same JSON into the read-only Viewer;
8. generate a Poster through the CLI;
9. select and move a Node using the keyboard.

Panel polish, Structurizr import, and portfolio integration follow this slice rather than block it.

## Explicit non-goals for the MVP

- realtime collaboration;
- backend persistence or authentication;
- durable version history or system-evolution playback;
- a separate Source Graph and multi-view projection layer;
- Structurizr, LikeC4, D2, Mermaid, PlantUML, Graphviz, or ELK runtime dependencies;
- built-in C4 semantics;
- nested or collapsible Groups;
- Connections attached to Groups;
- free camera orbit or free XYZ authoring;
- arbitrary Node rotation angles;
- mobile authoring;
- WebGPU;
- cloud-vendor asset packs;
- SVG or PDF export.

## Future-compatible extensions

- Source Graph projections into multiple Visualizations;
- Structurizr workspace JSON import, followed potentially by LikeC4 JSON import;
- lossy D2, Mermaid, or C4-PlantUML export;
- persistent Operation history for presenting system evolution;
- dynamic/use-case presentations over existing Connections;
- view filters, perspectives, and generated legends;
- nested Groups, elevation, stacking, or a WebGPU renderer when real scenes justify them.
