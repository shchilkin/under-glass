import type { Visualization } from "@under-glass/core";

export interface ViewerSnapshot {
  readonly status: "idle" | "loading" | "ready" | "error";
  readonly visualization: Visualization;
}

export interface ViewerController {
  getSnapshot(): ViewerSnapshot;
  subscribe(listener: () => void): () => void;
}
