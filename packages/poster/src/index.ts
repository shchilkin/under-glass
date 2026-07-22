import type { Visualization } from "@under-glass/core";

export interface PosterViewport {
  readonly height: number;
  readonly width: number;
}

export interface PosterRequest {
  readonly format: "png" | "webp";
  readonly viewport: PosterViewport;
  readonly visualization: Visualization;
}
