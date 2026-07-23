import {
  AmbientLight,
  Color,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  type Mesh,
  type Object3D,
} from "three";

import type { AssetDefinition, Node, Visualization } from "@under-glass/core";
import { validateVisualizationSemantics } from "@under-glass/core";

import {
  createAssetSession,
  recoverableAssetDiagnostic,
  type AssetSession,
  type PreparedNodeAsset,
} from "./asset-session.js";
import { parseGlb } from "./glb.js";
import {
  disposeObjectResourceRoots,
  disposeObjectResources,
} from "./resource-disposal.js";
import {
  createAssetPlaceholder,
  createGroundPlane,
  createPlacedAsset,
  updateAssetPlaceholder,
  updateGroundPlane,
} from "./scene-layout.js";
import { createSceneStateStore, type SceneStateStore } from "./scene-state.js";
import type {
  CreateSceneRendererOptions,
  SceneRenderer,
  SceneRendererDiagnostic,
} from "./types.js";

interface RenderingSurface {
  readonly camera: PerspectiveCamera;
  readonly canvas: HTMLCanvasElement;
  readonly groundPlane: Mesh;
  readonly resizeObserver: ResizeObserver;
  readonly scene: Scene;
  readonly webGlRenderer: WebGLRenderer;
}

interface RendererSession {
  readonly assetDefinitionsByNode: Map<string, AssetDefinition>;
  readonly assets: AssetSession;
  readonly placeholders: Map<string, Mesh>;
  disposed: boolean;
  surface: RenderingSurface | null;
}

interface NodeLoadContext {
  readonly isDisposed: () => boolean;
  readonly options: CreateSceneRendererOptions;
  readonly session: RendererSession;
  readonly surface: RenderingSurface;
}

function addAssetPlaceholders(
  nodes: readonly Node[],
  surface: RenderingSurface,
  session: RendererSession,
): void {
  for (const node of nodes) {
    const placeholder = createAssetPlaceholder(node);
    session.placeholders.set(node.id, placeholder);
    surface.scene.add(placeholder);
  }

  renderSurface(surface);
}

function removeAssetPlaceholder(
  nodeId: string,
  surface: RenderingSurface,
  session: RendererSession,
): void {
  const placeholder = session.placeholders.get(nodeId);

  if (placeholder === undefined) {
    return;
  }

  surface.scene.remove(placeholder);
  session.placeholders.delete(nodeId);
  disposeObjectResources(placeholder);
}

function renderSurface(surface: RenderingSurface): void {
  surface.webGlRenderer.render(surface.scene, surface.camera);
}

function resizeSurface(
  surface: RenderingSurface,
  container: HTMLElement,
): void {
  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);

  surface.camera.aspect = width / height;
  surface.camera.updateProjectionMatrix();
  surface.webGlRenderer.setSize(width, height, false);
  renderSurface(surface);
}

function createRenderingSurface(
  container: HTMLElement,
  visualization: Visualization,
): RenderingSurface {
  const canvas = document.createElement("canvas");
  const webGlRenderer = new WebGLRenderer({
    antialias: true,
    canvas,
    powerPreference: "high-performance",
  });
  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 100);
  const center = visualization.openingView.center;
  const groundPlane = createGroundPlane(visualization, new Map());

  canvas.dataset.underGlassRenderer = "";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.display = "block";
  canvas.style.height = "100%";
  canvas.style.width = "100%";
  container.append(canvas);

  webGlRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  webGlRenderer.outputColorSpace = SRGBColorSpace;
  scene.background = new Color(0x111816);
  scene.add(new AmbientLight(0xffffff, 1.7));
  scene.add(groundPlane);

  const keyLight = new DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(center.x + 4, 7, center.z + 5);
  scene.add(keyLight);

  camera.position.set(center.x + 5, 4.5, center.z + 6);
  camera.lookAt(center.x, 0, center.z);

  const surface: RenderingSurface = {
    camera,
    canvas,
    groundPlane,
    resizeObserver: new ResizeObserver(() => {
      resizeSurface(surface, container);
    }),
    scene,
    webGlRenderer,
  };

  surface.resizeObserver.observe(container);
  resizeSurface(surface, container);
  return surface;
}

function applyResolvedAssetDefinition(
  node: Node,
  definition: AssetDefinition,
  context: NodeLoadContext,
): void {
  context.session.assetDefinitionsByNode.set(node.id, definition);
  const placeholder = context.session.placeholders.get(node.id);

  if (placeholder !== undefined) {
    updateAssetPlaceholder(placeholder, node, definition);
  }

  updateGroundPlane(
    context.surface.groundPlane,
    context.options.visualization,
    context.session.assetDefinitionsByNode,
  );
  renderSurface(context.surface);
}

async function prepareNodeAsset(
  node: Node,
  context: NodeLoadContext,
): Promise<PreparedNodeAsset | null> {
  const assetLoad = context.session.assets.load(node);
  const resolvedAsset = await assetLoad.resolvedAsset;

  if (context.isDisposed()) {
    return null;
  }

  applyResolvedAssetDefinition(node, resolvedAsset.definition, context);
  return assetLoad.instantiate();
}

function completeNodeLoad(
  node: Node,
  loadedAsset: PreparedNodeAsset,
  surface: RenderingSurface,
  session: RendererSession,
): void {
  removeAssetPlaceholder(node.id, surface, session);
  surface.scene.add(
    createPlacedAsset(
      node,
      loadedAsset.resolvedAsset.definition,
      loadedAsset.asset,
    ),
  );
  renderSurface(surface);
}

function completePreparedNodeLoad(
  node: Node,
  loadedAsset: PreparedNodeAsset | null,
  surface: RenderingSurface,
  session: RendererSession,
  isDisposed: () => boolean,
): void {
  if (loadedAsset === null) {
    return;
  }

  if (isDisposed()) {
    session.assets.complete(loadedAsset.asset);
    return;
  }

  session.assets.complete(loadedAsset.asset);
  completeNodeLoad(node, loadedAsset, surface, session);
}

function reportRecoverableNodeFailure(
  node: Node,
  error: unknown,
  store: SceneStateStore,
  isDisposed: () => boolean,
): void {
  if (!isDisposed()) {
    const snapshot = store.getSnapshot();
    store.setSnapshot({
      diagnostics: [
        ...snapshot.diagnostics,
        recoverableAssetDiagnostic(node, error),
      ],
      status: "loading",
    });
  }
}

async function loadNode(
  node: Node,
  options: CreateSceneRendererOptions,
  surface: RenderingSurface,
  store: SceneStateStore,
  session: RendererSession,
  isDisposed: () => boolean,
): Promise<void> {
  try {
    const context: NodeLoadContext = {
      isDisposed,
      options,
      session,
      surface,
    };
    const loadedAsset = await prepareNodeAsset(node, context);

    completePreparedNodeLoad(node, loadedAsset, surface, session, isDisposed);
  } catch (error) {
    reportRecoverableNodeFailure(node, error, store, isDisposed);
  }
}

function disposeSurface(
  surface: RenderingSurface,
  assetRoots: Iterable<Object3D>,
): void {
  surface.resizeObserver.disconnect();
  disposeObjectResourceRoots([surface.scene, ...assetRoots]);
  surface.webGlRenderer.renderLists.dispose();
  surface.webGlRenderer.dispose();
  surface.webGlRenderer.forceContextLoss();
  surface.canvas.remove();
}

function unsupportedConnectionsDiagnostic(
  connectionCount: number,
): SceneRendererDiagnostic {
  return {
    code: "unsupported-connections",
    message: `Connections are deferred to v0.2; received ${connectionCount}.`,
    severity: "error",
  };
}

function rendererUnavailableDiagnostic(
  error: unknown,
): SceneRendererDiagnostic {
  const reason = error instanceof Error ? error.message : "Unknown error.";

  return {
    code: "renderer-unavailable",
    message: `The WebGL2 renderer could not start: ${reason}`,
    severity: "error",
  };
}

function deferFailedLifecycle(
  store: SceneStateStore,
  diagnostics: readonly SceneRendererDiagnostic[],
  isDisposed: () => boolean,
): void {
  queueMicrotask(() => {
    if (!isDisposed()) {
      store.setSnapshot({
        diagnostics,
        status: "failed",
      });
    }
  });
}

function semanticDiagnostics(
  visualization: Visualization,
): SceneRendererDiagnostic[] {
  return validateVisualizationSemantics(visualization).map((diagnostic) => ({
    code:
      diagnostic.severity === "error"
        ? "visualization-invalid"
        : "node-outside-group-bounds",
    entityId: diagnostic.entityId,
    message: diagnostic.message,
    severity: diagnostic.severity,
  }));
}

function visualizationDiagnostics(
  visualization: Visualization,
): SceneRendererDiagnostic[] {
  if (visualization.connections.length > 0) {
    return [unsupportedConnectionsDiagnostic(visualization.connections.length)];
  }

  return semanticDiagnostics(visualization);
}

function diagnosticsWithSeverity(
  diagnostics: readonly SceneRendererDiagnostic[],
  severity: SceneRendererDiagnostic["severity"],
): SceneRendererDiagnostic[] {
  return diagnostics.filter((diagnostic) => diagnostic.severity === severity);
}

async function loadNodes(
  nodes: readonly Node[],
  options: CreateSceneRendererOptions,
  surface: RenderingSurface,
  store: SceneStateStore,
  session: RendererSession,
): Promise<void> {
  await Promise.all(
    nodes.map((node) =>
      loadNode(node, options, surface, store, session, () => {
        return session.disposed;
      }),
    ),
  );

  if (!session.disposed) {
    store.setSnapshot({
      diagnostics: store.getSnapshot().diagnostics,
      status: "ready",
    });
  }
}

function startSceneRendering(
  options: CreateSceneRendererOptions,
  store: SceneStateStore,
  session: RendererSession,
): RenderingSurface | null {
  const diagnostics = visualizationDiagnostics(options.visualization);
  const fatalDiagnostics = diagnosticsWithSeverity(diagnostics, "error");

  if (fatalDiagnostics.length > 0) {
    deferFailedLifecycle(store, fatalDiagnostics, () => session.disposed);
    return null;
  }

  try {
    const surface = createRenderingSurface(
      options.container,
      options.visualization,
    );
    const recoverableDiagnostics = diagnosticsWithSeverity(
      diagnostics,
      "warning",
    );

    if (recoverableDiagnostics.length > 0) {
      store.setSnapshot({
        diagnostics: recoverableDiagnostics,
        status: "loading",
      });
    }

    addAssetPlaceholders(options.visualization.nodes, surface, session);
    void loadNodes(
      options.visualization.nodes,
      options,
      surface,
      store,
      session,
    );
    return surface;
  } catch (error) {
    deferFailedLifecycle(
      store,
      [rendererUnavailableDiagnostic(error)],
      () => session.disposed,
    );
    return null;
  }
}

function disposeRendererSession(
  store: SceneStateStore,
  session: RendererSession,
): void {
  if (session.disposed) {
    return;
  }

  session.disposed = true;
  store.dispose();

  if (session.surface !== null) {
    disposeSurface(session.surface, session.assets.disposalRoots());
  }
}

function createSceneRendererHandle(
  store: SceneStateStore,
  session: RendererSession,
): SceneRenderer {
  return {
    dispose(): void {
      disposeRendererSession(store, session);
    },
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
  };
}

export function createSceneRenderer(
  options: CreateSceneRendererOptions,
): SceneRenderer {
  const store = createSceneStateStore();
  let session: RendererSession;

  session = {
    assetDefinitionsByNode: new Map(),
    assets: createAssetSession({
      isDisposed: () => session.disposed,
      parseAsset: parseGlb,
      resolveAsset: options.resolveAsset,
    }),
    placeholders: new Map(),
    disposed: false,
    surface: null,
  };

  session.surface = startSceneRendering(options, store, session);
  return createSceneRendererHandle(store, session);
}
