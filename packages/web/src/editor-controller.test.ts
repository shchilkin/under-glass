import { describe, expect, it, vi } from "vitest";

import type { GroundBounds, Visualization } from "@under-glass/core";
import type {
  CreateSceneRendererOptions,
  SceneNodeInteraction,
  SceneRenderer,
} from "@under-glass/three";

import {
  createEditorControllerWithFactories,
  type EditorOperationEvent,
} from "./editor-controller.js";
import type {
  ViewerSemanticLayer,
  ViewerSemanticLayerFactory,
} from "./semantic-layer.js";
import type { SceneRendererFactory } from "./viewer-controller.js";

const VISUALIZATION = {
  schemaVersion: 1,
  nodes: [
    {
      id: "web",
      label: "Web",
      assetId: "service",
      position: { x: 0, z: 0 },
      quarterTurns: 0,
    },
    {
      id: "database",
      label: "Database",
      assetId: "database",
      position: { x: 3, z: 0 },
      quarterTurns: 0,
    },
  ],
  groups: [],
  connections: [],
  openingView: {
    cameraMode: "isometric",
    quarterTurns: 0,
    center: { x: 0, z: 0 },
    groundSpan: 12,
  },
} satisfies Visualization;

const FOOTPRINTS = new Map<string, GroundBounds>([
  ["web", { minX: -0.5, minZ: -0.5, maxX: 0.5, maxZ: 0.5 }],
  ["database", { minX: 2.5, minZ: -0.5, maxX: 3.5, maxZ: 0.5 }],
]);

function createContainer(): HTMLElement {
  const container = new EventTarget() as HTMLElement;
  Object.defineProperty(container, "ownerDocument", {
    value: new EventTarget(),
  });
  return container;
}

function createHarness(): {
  readonly createRenderer: SceneRendererFactory;
  readonly emitRendererChange: () => void;
  readonly footprints: Map<string, GroundBounds>;
  readonly interactions: SceneNodeInteraction[];
  readonly layer: ViewerSemanticLayer;
  readonly semanticFactory: ViewerSemanticLayerFactory;
} {
  const footprints = new Map(FOOTPRINTS);
  const interactions: SceneNodeInteraction[] = [];
  const rendererListeners = new Set<() => void>();
  let snapshot = {
    diagnostics: [],
    status: "ready",
  } as const;
  const renderer: SceneRenderer = {
    dispose: vi.fn(),
    getNodeFootprints: () => footprints,
    getSnapshot: () => snapshot,
    hitTestNode: vi.fn(() => null),
    projectPointerToGround: vi.fn(() => null),
    setCameraMode: vi.fn(),
    setCameraMotion: vi.fn(),
    setNodeInteraction(interaction): void {
      interactions.push(interaction);
    },
    subscribe(listener): () => void {
      rendererListeners.add(listener);
      return () => {
        rendererListeners.delete(listener);
      };
    },
  };
  const layer: ViewerSemanticLayer = {
    dispose: vi.fn(),
    setGraph: vi.fn(),
    setRendererSnapshot(nextSnapshot): void {
      snapshot = nextSnapshot as typeof snapshot;
    },
    setSelectedNodeId: vi.fn(),
  };

  return {
    createRenderer: vi.fn((_options: CreateSceneRendererOptions) => renderer),
    emitRendererChange(): void {
      for (const listener of [...rendererListeners]) {
        listener();
      }
    },
    footprints,
    interactions,
    layer,
    semanticFactory: vi.fn(() => layer),
  };
}

describe("EditorController", () => {
  it("keeps Selection transient and synchronizes visual and semantic treatments", () => {
    const harness = createHarness();
    const controller = createEditorControllerWithFactories(
      {
        accessibility: {
          resolveEntityLabel: ({ id }) => id,
          sceneLabel: "Test architecture",
        },
        container: createContainer(),
        gridStep: 1,
        onOperation: vi.fn(),
        resolveAsset: vi.fn(),
        visualization: VISUALIZATION,
      },
      harness.createRenderer,
      harness.semanticFactory,
    );

    controller.selectNode("web");

    expect(controller.getSnapshot().selectedNodeId).toBe("web");
    expect(controller.getSnapshot().visualization).toBe(VISUALIZATION);
    expect(harness.interactions.at(-1)).toEqual({
      preview: null,
      selectedNodeId: "web",
    });
    expect(harness.layer.setSelectedNodeId).toHaveBeenLastCalledWith("web");
  });

  it("previews collision, commits one valid Operation, then undoes and redoes it", () => {
    const harness = createHarness();
    const events: EditorOperationEvent[] = [];
    const controller = createEditorControllerWithFactories(
      {
        accessibility: {
          resolveEntityLabel: ({ id }) => id,
          sceneLabel: "Test architecture",
        },
        container: createContainer(),
        gridStep: 1,
        onOperation: (event) => events.push(event),
        resolveAsset: vi.fn(),
        visualization: VISUALIZATION,
      },
      harness.createRenderer,
      harness.semanticFactory,
    );

    controller.selectNode("web");
    expect(controller.previewNodeMove({ x: 3, z: 0 })).toMatchObject({
      conflictingNodeIds: ["database"],
      position: { x: 3, z: 0 },
      valid: false,
    });
    expect(controller.commitNodeMove()).toBe(false);
    expect(events).toHaveLength(0);

    expect(controller.previewNodeMove({ x: 1.2, z: 0 })).toMatchObject({
      position: { x: 1, z: 0 },
      valid: true,
    });
    controller.cancelNodeMove();
    expect(controller.getSnapshot()).toMatchObject({
      canUndo: false,
      dragPreview: null,
      visualization: VISUALIZATION,
    });
    expect(events).toHaveLength(0);

    expect(controller.previewNodeMove({ x: 1.2, z: 0 })).toMatchObject({
      position: { x: 1, z: 0 },
      valid: true,
    });
    expect(controller.commitNodeMove()).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      operation: {
        from: { x: 0, z: 0 },
        kind: "moveNode",
        nodeId: "web",
        to: { x: 1, z: 0 },
      },
      source: "commit",
    });
    expect(controller.getSnapshot()).toMatchObject({
      canRedo: false,
      canUndo: true,
      dragPreview: null,
    });
    expect(controller.getSnapshot().visualization.nodes[0]?.position).toEqual({
      x: 1,
      z: 0,
    });

    expect(controller.undo()).toBe(true);
    expect(controller.getSnapshot().visualization.nodes[0]?.position).toEqual({
      x: 0,
      z: 0,
    });
    expect(controller.redo()).toBe(true);
    expect(controller.getSnapshot().visualization.nodes[0]?.position).toEqual({
      x: 1,
      z: 0,
    });
    expect(events.map((event) => event.source)).toEqual([
      "commit",
      "undo",
      "redo",
    ]);
  });

  it("revalidates Asset Footprints when a preview is committed", () => {
    const harness = createHarness();
    const onOperation = vi.fn();
    const controller = createEditorControllerWithFactories(
      {
        accessibility: {
          resolveEntityLabel: ({ id }) => id,
          sceneLabel: "Test architecture",
        },
        container: createContainer(),
        gridStep: 1,
        onOperation,
        resolveAsset: vi.fn(),
        visualization: VISUALIZATION,
      },
      harness.createRenderer,
      harness.semanticFactory,
    );

    controller.selectNode("web");
    expect(controller.previewNodeMove({ x: 1, z: 0 })?.valid).toBe(true);
    harness.footprints.set("database", {
      minX: 0.6,
      minZ: -0.5,
      maxX: 1.6,
      maxZ: 0.5,
    });
    harness.emitRendererChange();

    expect(controller.getSnapshot().dragPreview?.valid).toBe(false);
    expect(harness.interactions.at(-1)?.preview?.valid).toBe(false);
    expect(controller.commitNodeMove()).toBe(false);
    expect(controller.getSnapshot().visualization).toBe(VISUALIZATION);
    expect(onOperation).not.toHaveBeenCalled();
  });

  it("removes listeners and becomes inert after disposal", () => {
    const harness = createHarness();
    const container = createContainer();
    const removeContainerListener = vi.spyOn(container, "removeEventListener");
    const removeDocumentListener = vi.spyOn(
      container.ownerDocument,
      "removeEventListener",
    );
    const controller = createEditorControllerWithFactories(
      {
        accessibility: {
          resolveEntityLabel: ({ id }) => id,
          sceneLabel: "Test architecture",
        },
        container,
        onOperation: vi.fn(),
        resolveAsset: vi.fn(),
        visualization: VISUALIZATION,
      },
      harness.createRenderer,
      harness.semanticFactory,
    );

    controller.dispose();
    controller.selectNode("web");

    expect(removeContainerListener).toHaveBeenCalled();
    expect(removeDocumentListener).toHaveBeenCalled();
    expect(controller.getSnapshot().selectedNodeId).toBeNull();
  });
});
