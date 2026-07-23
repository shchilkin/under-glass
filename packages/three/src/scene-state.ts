import type { SceneRendererSnapshot } from "./types.js";

export interface SceneStateStore {
  dispose(): void;
  getSnapshot(): SceneRendererSnapshot;
  setSnapshot(snapshot: SceneRendererSnapshot): void;
  subscribe(listener: () => void): () => void;
}

export function createSceneStateStore(): SceneStateStore {
  let snapshot: SceneRendererSnapshot = {
    diagnostics: [],
    status: "loading",
  };
  const listeners = new Set<() => void>();

  return {
    dispose(): void {
      listeners.clear();
    },
    getSnapshot(): SceneRendererSnapshot {
      return snapshot;
    },
    setSnapshot(nextSnapshot: SceneRendererSnapshot): void {
      snapshot = nextSnapshot;

      for (const listener of listeners) {
        listener();
      }
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
