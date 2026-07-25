import type {
  AssetDefinition,
  DiagnosticSeverity,
  GroundBounds,
  GroundPoint,
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

export type CameraMotion = "responsive" | "spring";

export interface CreateSceneRendererOptions {
  readonly cameraMotion?: CameraMotion;
  readonly container: HTMLElement;
  readonly resolveAsset: AssetResolver;
  readonly visualization: Visualization;
}

export interface SetCameraModeOptions {
  readonly transition?: "auto" | "immediate";
}

export interface ScenePointer {
  readonly clientX: number;
  readonly clientY: number;
}

export interface SceneNodePreview {
  readonly nodeId: string;
  readonly position: GroundPoint;
  readonly valid: boolean;
}

export interface SceneNodeInteraction {
  readonly preview: SceneNodePreview | null;
  readonly selectedNodeId: string | null;
}

export interface SceneRenderer {
  dispose(): void;
  getNodeFootprints(): ReadonlyMap<string, GroundBounds>;
  getSnapshot(): SceneRendererSnapshot;
  hitTestNode(pointer: ScenePointer): string | null;
  projectPointerToGround(pointer: ScenePointer): GroundPoint | null;
  setCameraMotion(cameraMotion: CameraMotion): void;
  setNodeInteraction(interaction: SceneNodeInteraction): void;
  setCameraMode(
    cameraMode: OpeningView["cameraMode"],
    options?: SetCameraModeOptions,
  ): void;
  subscribe(listener: () => void): () => void;
}
