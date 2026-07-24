import type { OpeningView, Visualization } from "@under-glass/core";
import {
  createSceneRenderer,
  type AssetResolver,
  type CameraMotion,
  type CreateSceneRendererOptions,
  type SceneRenderer,
  type SceneRendererDiagnostic,
  type SceneRendererStatus,
  type SetCameraModeOptions,
} from "@under-glass/three";

export interface ViewerSnapshot {
  readonly diagnostics: readonly SceneRendererDiagnostic[];
  readonly status: SceneRendererStatus;
  readonly visualization: Visualization;
}

export interface CreateViewerControllerOptions {
  readonly cameraMotion?: CameraMotion;
  readonly container: HTMLElement;
  readonly resolveAsset: AssetResolver;
  readonly visualization: Visualization;
}

export interface ViewerController {
  dispose(): void;
  getSnapshot(): ViewerSnapshot;
  setCameraMode(
    cameraMode: OpeningView["cameraMode"],
    options?: SetCameraModeOptions,
  ): void;
  setCameraMotion(cameraMotion: CameraMotion): void;
  setVisualization(visualization: Visualization): void;
  subscribe(listener: () => void): () => void;
}

export type SceneRendererFactory = (
  options: CreateSceneRendererOptions,
) => SceneRenderer;

function createRendererOptions(
  options: CreateViewerControllerOptions,
  visualization: Visualization,
  cameraMotion: CameraMotion | undefined,
): CreateSceneRendererOptions {
  const baseOptions = {
    container: options.container,
    resolveAsset: options.resolveAsset,
    visualization,
  };

  return cameraMotion === undefined
    ? baseOptions
    : { ...baseOptions, cameraMotion };
}

export function createViewerControllerWithRenderer(
  options: CreateViewerControllerOptions,
  createRenderer: SceneRendererFactory,
): ViewerController {
  let active = true;
  let cameraMotion = options.cameraMotion;
  let visualization = options.visualization;
  let renderer = createRenderer(
    createRendererOptions(options, visualization, cameraMotion),
  );
  let rendererUnsubscribe: () => void = () => {};
  let snapshot: ViewerSnapshot = {
    ...renderer.getSnapshot(),
    visualization,
  };
  const listeners = new Set<() => void>();

  const publishRendererSnapshot = (): void => {
    if (!active) {
      return;
    }

    snapshot = {
      ...renderer.getSnapshot(),
      visualization,
    };

    for (const listener of [...listeners]) {
      listener();
    }
  };

  const subscribeToRenderer = (): void => {
    rendererUnsubscribe = renderer.subscribe(publishRendererSnapshot);
  };

  subscribeToRenderer();

  return {
    dispose(): void {
      if (!active) {
        return;
      }

      active = false;
      rendererUnsubscribe();
      renderer.dispose();
      listeners.clear();
    },
    getSnapshot(): ViewerSnapshot {
      return snapshot;
    },
    setCameraMode(cameraMode, cameraOptions): void {
      if (active) {
        renderer.setCameraMode(cameraMode, cameraOptions);
      }
    },
    setCameraMotion(nextCameraMotion): void {
      if (!active) {
        return;
      }

      cameraMotion = nextCameraMotion;
      renderer.setCameraMotion(nextCameraMotion);
    },
    setVisualization(nextVisualization): void {
      if (!active) {
        return;
      }

      rendererUnsubscribe();
      renderer.dispose();
      visualization = nextVisualization;
      renderer = createRenderer(
        createRendererOptions(options, visualization, cameraMotion),
      );
      snapshot = {
        ...renderer.getSnapshot(),
        visualization,
      };
      subscribeToRenderer();

      for (const listener of [...listeners]) {
        listener();
      }
    },
    subscribe(listener): () => void {
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

export function createViewerController(
  options: CreateViewerControllerOptions,
): ViewerController {
  return createViewerControllerWithRenderer(options, createSceneRenderer);
}
