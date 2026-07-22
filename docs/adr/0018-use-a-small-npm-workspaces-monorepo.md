# Use a small npm workspaces monorepo

The repository uses npm workspaces with `packages/core` for schema, operations, routing, and session history; `packages/three` for the WebGL2 renderer and 3D asset runtime; `packages/web` for the framework-neutral ViewerController, labels, accessibility, and optional custom element; `packages/react` for the React 19 Editor and Viewer adapter; and `apps/playground` as the integration demo. These boundaries mirror the agreed architecture while avoiding premature fragmentation into feature-sized packages.
