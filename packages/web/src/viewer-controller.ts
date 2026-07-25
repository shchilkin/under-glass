import type { OpeningView, Visualization } from "@under-glass/core";
import {
  createSceneRenderer,
  type AssetResolver,
  type CameraMotion,
  type CreateSceneRendererOptions,
  type SceneRenderer,
  type SceneRendererDiagnostic,
  type SceneRendererResourceMetrics,
  type SceneRendererStatus,
  type SetCameraModeOptions,
} from "@under-glass/three";

import {
  createViewerSemanticGraph,
  type ViewerAccessibility,
} from "./semantic-graph.js";
import {
  createViewerSemanticLayer,
  type ViewerSemanticLayerFactory,
} from "./semantic-layer.js";

export interface ViewerSnapshot {
  readonly diagnostics: readonly SceneRendererDiagnostic[];
  readonly resourceMetrics: SceneRendererResourceMetrics;
  readonly status: SceneRendererStatus;
  readonly visualization: Visualization;
}

export interface CreateViewerControllerOptions {
  readonly accessibility: ViewerAccessibility;
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
  createSemanticLayer: ViewerSemanticLayerFactory = createViewerSemanticLayer,
): ViewerController {
  let active = true;
  let cameraMode = options.visualization.openingView.cameraMode;
  let cameraMotion = options.cameraMotion;
  let visualization = options.visualization;
  let renderer = createRenderer(
    createRendererOptions(options, visualization, cameraMotion),
  );
  const semanticLayer = createSemanticLayer(
    options.container,
    createViewerSemanticGraph(visualization, options.accessibility),
  );
  let rendererUnsubscribe: () => void = () => {};
  const synchronizeRendererSnapshot = (): ViewerSnapshot => {
    const rendererSnapshot = renderer.getSnapshot();

    semanticLayer.setRendererSnapshot(rendererSnapshot);
    return {
      ...rendererSnapshot,
      visualization,
    };
  };
  let snapshot = synchronizeRendererSnapshot();
  const listeners = new Set<() => void>();

  const publishRendererSnapshot = (): void => {
    if (!active) {
      return;
    }

    snapshot = synchronizeRendererSnapshot();

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
      semanticLayer.dispose();
      listeners.clear();
    },
    getSnapshot(): ViewerSnapshot {
      return snapshot;
    },
    setCameraMode(nextCameraMode, cameraOptions): void {
      if (active) {
        cameraMode = nextCameraMode;
        renderer.setCameraMode(nextCameraMode, cameraOptions);
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
      semanticLayer.setGraph(
        createViewerSemanticGraph(visualization, options.accessibility),
      );
      renderer = createRenderer(
        createRendererOptions(options, visualization, cameraMotion),
      );
      if (visualization.openingView.cameraMode !== cameraMode) {
        renderer.setCameraMode(cameraMode, { transition: "immediate" });
      }
      snapshot = synchronizeRendererSnapshot();
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
  return createViewerControllerWithRenderer(
    options,
    createSceneRenderer,
    createViewerSemanticLayer,
  );
}
