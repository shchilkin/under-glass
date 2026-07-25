import type { SceneRendererSnapshot } from "./types.js";

export interface SceneStateStore {
  dispose(): void;
  getSnapshot(): SceneRendererSnapshot;
  setSnapshot(snapshot: SceneRendererSnapshot): void;
  subscribe(listener: () => void): () => void;
}

export function createSceneStateStore(): SceneStateStore {
  let active = true;
  let snapshot: SceneRendererSnapshot = {
    diagnostics: [],
    resourceMetrics: {
      cachedAssetCount: 0,
      nodeInstanceCount: 0,
      parsedAssetCount: 0,
    },
    status: "loading",
  };
  const listeners = new Set<() => void>();

  return {
    dispose(): void {
      active = false;
      listeners.clear();
    },
    getSnapshot(): SceneRendererSnapshot {
      return snapshot;
    },
    setSnapshot(nextSnapshot: SceneRendererSnapshot): void {
      if (!active) {
        return;
      }

      snapshot = nextSnapshot;

      for (const listener of listeners) {
        listener();
      }
    },
    subscribe(listener: () => void): () => void {
      if (!active) {
        return () => {};
      }

      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
