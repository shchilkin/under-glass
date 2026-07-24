import { describe, expect, it, vi } from "vitest";

import type { Visualization } from "@under-glass/core";
import type {
  CreateSceneRendererOptions,
  SceneRenderer,
  SceneRendererSnapshot,
} from "@under-glass/three";

import {
  createViewerControllerWithRenderer,
  type SceneRendererFactory,
} from "./viewer-controller.js";

const FIRST_VISUALIZATION = {
  schemaVersion: 1,
  nodes: [],
  groups: [],
  connections: [],
  openingView: {
    cameraMode: "isometric",
    quarterTurns: 0,
    center: { x: 0, z: 0 },
    groundSpan: 12,
  },
} satisfies Visualization;

const SECOND_VISUALIZATION = {
  ...FIRST_VISUALIZATION,
  openingView: {
    ...FIRST_VISUALIZATION.openingView,
    cameraMode: "top",
  },
} satisfies Visualization;

interface RendererHarness {
  readonly emit: (snapshot: SceneRendererSnapshot) => void;
  readonly renderer: SceneRenderer;
}

function createRendererHarness(): RendererHarness {
  let snapshot: SceneRendererSnapshot = {
    diagnostics: [],
    status: "loading",
  };
  const listeners = new Set<() => void>();
  const renderer: SceneRenderer = {
    dispose: vi.fn(() => {
      listeners.clear();
    }),
    getSnapshot: () => snapshot,
    setCameraMode: vi.fn(),
    setCameraMotion: vi.fn(),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return {
    emit(nextSnapshot): void {
      snapshot = nextSnapshot;
      for (const listener of [...listeners]) {
        listener();
      }
    },
    renderer,
  };
}

function createHarnessFactory(): {
  readonly createRenderer: SceneRendererFactory;
  readonly harnesses: RendererHarness[];
  readonly options: CreateSceneRendererOptions[];
} {
  const harnesses: RendererHarness[] = [];
  const rendererOptions: CreateSceneRendererOptions[] = [];

  return {
    createRenderer(options): SceneRenderer {
      const harness = createRendererHarness();
      harnesses.push(harness);
      rendererOptions.push(options);
      return harness.renderer;
    },
    harnesses,
    options: rendererOptions,
  };
}

describe("createViewerController", () => {
  it("publishes renderer lifecycle snapshots with the host visualization", () => {
    const factory = createHarnessFactory();
    const listener = vi.fn();
    const resolveAsset = vi.fn();
    const container = {} as HTMLElement;
    const controller = createViewerControllerWithRenderer(
      {
        container,
        resolveAsset,
        visualization: FIRST_VISUALIZATION,
      },
      factory.createRenderer,
    );

    controller.subscribe(listener);
    factory.harnesses[0]?.emit({
      diagnostics: [],
      status: "ready",
    });

    expect(listener).toHaveBeenCalledOnce();
    expect(controller.getSnapshot()).toEqual({
      diagnostics: [],
      status: "ready",
      visualization: FIRST_VISUALIZATION,
    });
    expect(factory.options[0]).toEqual({
      container,
      resolveAsset,
      visualization: FIRST_VISUALIZATION,
    });
  });

  it("replaces the renderer while preserving the selected motion profile", () => {
    const factory = createHarnessFactory();
    const listener = vi.fn();
    const controller = createViewerControllerWithRenderer(
      {
        container: {} as HTMLElement,
        resolveAsset: vi.fn(),
        visualization: FIRST_VISUALIZATION,
      },
      factory.createRenderer,
    );

    controller.subscribe(listener);
    controller.setCameraMotion("spring");
    controller.setVisualization(SECOND_VISUALIZATION);

    expect(factory.harnesses[0]?.renderer.setCameraMotion).toHaveBeenCalledWith(
      "spring",
    );
    expect(factory.harnesses[0]?.renderer.dispose).toHaveBeenCalledOnce();
    expect(factory.options[1]).toMatchObject({
      cameraMotion: "spring",
      visualization: SECOND_VISUALIZATION,
    });
    expect(controller.getSnapshot().visualization).toBe(SECOND_VISUALIZATION);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("forwards camera controls and becomes inert after disposal", () => {
    const factory = createHarnessFactory();
    const listener = vi.fn();
    const controller = createViewerControllerWithRenderer(
      {
        cameraMotion: "responsive",
        container: {} as HTMLElement,
        resolveAsset: vi.fn(),
        visualization: FIRST_VISUALIZATION,
      },
      factory.createRenderer,
    );
    const renderer = factory.harnesses[0]?.renderer;

    controller.subscribe(listener);
    controller.setCameraMode("top", { transition: "immediate" });
    controller.dispose();
    controller.setCameraMode("isometric");
    controller.setVisualization(SECOND_VISUALIZATION);
    factory.harnesses[0]?.emit({ diagnostics: [], status: "ready" });

    expect(renderer?.setCameraMode).toHaveBeenCalledTimes(1);
    expect(renderer?.setCameraMode).toHaveBeenCalledWith("top", {
      transition: "immediate",
    });
    expect(renderer?.dispose).toHaveBeenCalledOnce();
    expect(factory.harnesses).toHaveLength(1);
    expect(listener).not.toHaveBeenCalled();
  });
});
