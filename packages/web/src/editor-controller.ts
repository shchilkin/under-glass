import {
  assertValidGridStep,
  createEditorOperationHistory,
  evaluateNodePlacement,
  groundPointsEqual,
  type GroundPoint,
  type MoveNodeOperation,
  type NodePlacementPreview,
  type OpeningView,
  type Visualization,
} from "@under-glass/core";
import {
  createSceneRenderer,
  type CameraMotion,
  type SceneRenderer,
  type SetCameraModeOptions,
} from "@under-glass/three";

import {
  createViewerSemanticLayer,
  type ViewerSemanticLayer,
  type ViewerSemanticLayerFactory,
} from "./semantic-layer.js";
import {
  createViewerControllerWithRenderer,
  type CreateViewerControllerOptions,
  type SceneRendererFactory,
  type ViewerController,
  type ViewerSnapshot,
} from "./viewer-controller.js";

export interface EditorOperationEvent {
  readonly operation: MoveNodeOperation;
  readonly source: "commit" | "redo" | "undo";
  readonly visualization: Visualization;
}

export interface CreateEditorControllerOptions extends CreateViewerControllerOptions {
  readonly gridStep?: number | null;
  readonly historyCapacity?: number;
  readonly onOperation: (event: EditorOperationEvent) => void;
}

export interface EditorSnapshot extends ViewerSnapshot {
  readonly canRedo: boolean;
  readonly canUndo: boolean;
  readonly dragPreview: NodePlacementPreview | null;
  readonly gridStep: number | null;
  readonly selectedNodeId: string | null;
}

export interface EditorController {
  cancelNodeMove(): void;
  commitNodeMove(): boolean;
  dispose(): void;
  getSnapshot(): EditorSnapshot;
  previewNodeMove(target: GroundPoint): NodePlacementPreview | null;
  redo(): boolean;
  selectNode(nodeId: string | null): void;
  setCameraMode(
    cameraMode: OpeningView["cameraMode"],
    options?: SetCameraModeOptions,
  ): void;
  setCameraMotion(cameraMotion: CameraMotion): void;
  setGridStep(gridStep: number | null): void;
  setVisualization(visualization: Visualization): void;
  subscribe(listener: () => void): () => void;
  undo(): boolean;
}

function pointerFromEvent(event: PointerEvent): {
  readonly clientX: number;
  readonly clientY: number;
} {
  return {
    clientX: event.clientX,
    clientY: event.clientY,
  };
}

export function createEditorControllerWithFactories(
  options: CreateEditorControllerOptions,
  createRenderer: SceneRendererFactory,
  createSemanticLayer: ViewerSemanticLayerFactory = createViewerSemanticLayer,
): EditorController {
  let active = true;
  let activeRenderer: SceneRenderer | null = null;
  let semanticLayer: ViewerSemanticLayer | null = null;
  let selectedNodeId: string | null = null;
  let dragPreview: NodePlacementPreview | null = null;
  let dragPointerId: number | null = null;
  let gridStep = options.gridStep === undefined ? 1 : options.gridStep;
  let visualization = options.visualization;
  let activateSemanticNode = (_nodeId: string): void => {};
  const listeners = new Set<() => void>();
  const history = createEditorOperationHistory(
    options.historyCapacity === undefined
      ? {}
      : { capacity: options.historyCapacity },
  );
  const clearDragState = (): boolean => {
    const hadDrag = dragPreview !== null || dragPointerId !== null;
    dragPreview = null;
    dragPointerId = null;
    return hadDrag;
  };

  const rendererFactory: SceneRendererFactory = (rendererOptions) => {
    activeRenderer = createRenderer(rendererOptions);
    return activeRenderer;
  };
  const semanticFactory: ViewerSemanticLayerFactory = (container, graph) => {
    semanticLayer = createSemanticLayer(container, graph, {
      onNodeActivate: (nodeId) => activateSemanticNode(nodeId),
    });
    return semanticLayer;
  };
  const viewer: ViewerController = createViewerControllerWithRenderer(
    options,
    rendererFactory,
    semanticFactory,
  );

  const publish = (): void => {
    if (!active) {
      return;
    }

    for (const listener of [...listeners]) {
      listener();
    }
  };

  const applyInteraction = (): void => {
    activeRenderer?.setNodeInteraction({
      preview:
        dragPreview === null
          ? null
          : {
              nodeId: dragPreview.nodeId,
              position: dragPreview.position,
              valid: dragPreview.valid,
            },
      selectedNodeId,
    });
    semanticLayer?.setSelectedNodeId(selectedNodeId);
  };

  const replaceVisualization = (nextVisualization: Visualization): void => {
    visualization = nextVisualization;
    viewer.setVisualization(nextVisualization);
    applyInteraction();
  };

  const emitTransition = (event: EditorOperationEvent): void => {
    replaceVisualization(event.visualization);
    options.onOperation(event);
  };

  const selectNode = (nodeId: string | null): void => {
    if (!active) {
      return;
    }

    const nextNodeId =
      nodeId !== null &&
      visualization.nodes.some((candidate) => candidate.id === nodeId)
        ? nodeId
        : null;

    if (nextNodeId === selectedNodeId && dragPreview === null) {
      return;
    }

    selectedNodeId = nextNodeId;
    clearDragState();
    applyInteraction();
    publish();
  };
  activateSemanticNode = selectNode;

  const previewNodeMove = (
    target: GroundPoint,
  ): NodePlacementPreview | null => {
    if (!active || selectedNodeId === null || activeRenderer === null) {
      return null;
    }

    dragPreview = evaluateNodePlacement({
      footprintsByNode: activeRenderer.getNodeFootprints(),
      gridStep,
      nodeId: selectedNodeId,
      target,
      visualization,
    });
    applyInteraction();
    publish();
    return dragPreview;
  };

  const refreshDragPreview = (): void => {
    if (dragPreview === null || activeRenderer === null) {
      return;
    }

    dragPreview = evaluateNodePlacement({
      footprintsByNode: activeRenderer.getNodeFootprints(),
      gridStep,
      nodeId: dragPreview.nodeId,
      target: dragPreview.position,
      visualization,
    });
    applyInteraction();
  };

  const cancelNodeMove = (): void => {
    if (!active) {
      return;
    }

    const hadDrag = clearDragState();
    if (!hadDrag) {
      return;
    }
    applyInteraction();
    publish();
  };

  const commitNodeMove = (): boolean => {
    const preview =
      dragPreview === null || activeRenderer === null
        ? dragPreview
        : evaluateNodePlacement({
            footprintsByNode: activeRenderer.getNodeFootprints(),
            gridStep,
            nodeId: dragPreview.nodeId,
            target: dragPreview.position,
            visualization,
          });
    const node =
      preview === null
        ? undefined
        : visualization.nodes.find(
            (candidate) => candidate.id === preview.nodeId,
          );

    clearDragState();
    if (!active || preview === null || node === undefined || !preview.valid) {
      applyInteraction();
      publish();
      return false;
    }

    if (groundPointsEqual(node.position, preview.position)) {
      applyInteraction();
      publish();
      return false;
    }

    const operation: MoveNodeOperation = {
      from: node.position,
      kind: "moveNode",
      nodeId: node.id,
      to: preview.position,
    };
    const nextVisualization = history.commit(visualization, operation);
    emitTransition({
      operation,
      source: "commit",
      visualization: nextVisualization,
    });
    return true;
  };

  const applyHistoryTransition = (direction: "redo" | "undo"): boolean => {
    if (!active) {
      return false;
    }

    clearDragState();
    const transition =
      direction === "undo"
        ? history.undo(visualization)
        : history.redo(visualization);
    if (transition === null) {
      applyInteraction();
      publish();
      return false;
    }

    emitTransition(transition);
    return true;
  };
  const undo = (): boolean => applyHistoryTransition("undo");
  const redo = (): boolean => applyHistoryTransition("redo");

  const onPointerDown = (event: PointerEvent): void => {
    if (!active || activeRenderer === null) {
      return;
    }

    const target = event.target;
    if (
      !(target instanceof HTMLElement) ||
      target.dataset.underGlassRenderer === undefined
    ) {
      return;
    }

    const nodeId = activeRenderer.hitTestNode(pointerFromEvent(event));
    selectNode(nodeId);
    if (nodeId !== null) {
      dragPointerId = event.pointerId;
      target.setPointerCapture?.(event.pointerId);
    }
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (
      !active ||
      activeRenderer === null ||
      dragPointerId !== event.pointerId
    ) {
      return;
    }

    const point = activeRenderer.projectPointerToGround(
      pointerFromEvent(event),
    );
    if (point !== null) {
      previewNodeMove(point);
    }
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (!active || dragPointerId !== event.pointerId) {
      return;
    }

    if (dragPreview !== null) {
      commitNodeMove();
    } else {
      clearDragState();
    }
  };

  const onPointerCancel = (event: PointerEvent): void => {
    if (dragPointerId === event.pointerId) {
      cancelNodeMove();
    }
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (!active) {
      return;
    }

    if (
      event.key === "Escape" &&
      (dragPointerId !== null || dragPreview !== null)
    ) {
      cancelNodeMove();
      event.preventDefault();
      return;
    }

    const modifier = event.metaKey || event.ctrlKey;
    if (!modifier) {
      return;
    }

    const key = event.key.toLowerCase();
    const didChange =
      key === "z"
        ? event.shiftKey
          ? redo()
          : undo()
        : key === "y" && event.ctrlKey
          ? redo()
          : false;
    if (didChange) {
      event.preventDefault();
    }
  };

  options.container.addEventListener("pointerdown", onPointerDown);
  options.container.addEventListener("pointermove", onPointerMove);
  options.container.addEventListener("pointerup", onPointerUp);
  options.container.addEventListener("pointercancel", onPointerCancel);
  options.container.ownerDocument.addEventListener("keydown", onKeyDown);
  const viewerUnsubscribe = viewer.subscribe(() => {
    refreshDragPreview();
    publish();
  });

  return {
    cancelNodeMove,
    commitNodeMove,
    dispose(): void {
      if (!active) {
        return;
      }

      active = false;
      options.container.removeEventListener("pointerdown", onPointerDown);
      options.container.removeEventListener("pointermove", onPointerMove);
      options.container.removeEventListener("pointerup", onPointerUp);
      options.container.removeEventListener("pointercancel", onPointerCancel);
      options.container.ownerDocument.removeEventListener("keydown", onKeyDown);
      viewerUnsubscribe();
      viewer.dispose();
      activeRenderer = null;
      semanticLayer = null;
      selectedNodeId = null;
      clearDragState();
      listeners.clear();
    },
    getSnapshot(): EditorSnapshot {
      const viewerSnapshot = viewer.getSnapshot();
      return {
        ...viewerSnapshot,
        ...history.getSnapshot(),
        dragPreview,
        gridStep,
        selectedNodeId,
        visualization,
      };
    },
    previewNodeMove,
    redo,
    selectNode,
    setCameraMode(cameraMode, cameraOptions): void {
      viewer.setCameraMode(cameraMode, cameraOptions);
    },
    setCameraMotion(cameraMotion): void {
      viewer.setCameraMotion(cameraMotion);
    },
    setGridStep(nextGridStep): void {
      if (!active) {
        return;
      }

      assertValidGridStep(nextGridStep);
      gridStep = nextGridStep;
      if (dragPreview !== null) {
        previewNodeMove(dragPreview.position);
      } else {
        publish();
      }
    },
    setVisualization(nextVisualization): void {
      if (!active || nextVisualization === visualization) {
        return;
      }

      history.clear();
      visualization = nextVisualization;
      clearDragState();
      if (
        selectedNodeId !== null &&
        !visualization.nodes.some((node) => node.id === selectedNodeId)
      ) {
        selectedNodeId = null;
      }
      replaceVisualization(nextVisualization);
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
    undo,
  };
}

export function createEditorController(
  options: CreateEditorControllerOptions,
): EditorController {
  return createEditorControllerWithFactories(
    options,
    createSceneRenderer,
    createViewerSemanticLayer,
  );
}
