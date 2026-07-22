import type { Visualization } from "@under-glass/core";

export interface SceneRenderer {
  readonly visualization: Visualization;
  dispose(): void;
}
