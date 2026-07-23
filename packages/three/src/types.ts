import type {
  AssetDefinition,
  DiagnosticSeverity,
  Visualization,
} from "@under-glass/core";

export type SceneRendererStatus = "failed" | "loading" | "ready";

export type SceneRendererDiagnosticCode =
  | "asset-definition-mismatch"
  | "asset-load-failed"
  | "renderer-unavailable"
  | "unsupported-node-count";

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

export interface SceneRenderer {
  dispose(): void;
  getSnapshot(): SceneRendererSnapshot;
  subscribe(listener: () => void): () => void;
}
