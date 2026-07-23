import type {
  AssetDefinition,
  DiagnosticSeverity,
  OpeningView,
  Visualization,
} from "@under-glass/core";

export type SceneRendererStatus = "failed" | "loading" | "ready";

export type SceneRendererDiagnosticCode =
  | "asset-definition-mismatch"
  | "asset-load-failed"
  | "node-outside-group-bounds"
  | "renderer-unavailable"
  | "visualization-invalid";

export interface SceneRendererDiagnostic {
  readonly code: SceneRendererDiagnosticCode;
  readonly entityId?: string;
  readonly message: string;
  readonly severity: DiagnosticSeverity;
}

export interface SceneRendererSnapshot {
  readonly diagnostics: readonly SceneRendererDiagnostic[];
  readonly status: SceneRendererStatus;
}

export interface ResolvedAsset {
  readonly bytes: ArrayBuffer;
  readonly definition: AssetDefinition;
}

export type AssetResolver = (assetId: string) => Promise<ResolvedAsset>;

export interface CreateSceneRendererOptions {
  readonly container: HTMLElement;
  readonly resolveAsset: AssetResolver;
  readonly visualization: Visualization;
}

export interface SetCameraModeOptions {
  readonly transition?: "auto" | "immediate";
}

export interface SceneRenderer {
  dispose(): void;
  getSnapshot(): SceneRendererSnapshot;
  setCameraMode(
    cameraMode: OpeningView["cameraMode"],
    options?: SetCameraModeOptions,
  ): void;
  subscribe(listener: () => void): () => void;
}
