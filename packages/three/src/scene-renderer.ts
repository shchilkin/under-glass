import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  OrthographicCamera,
  PCFShadowMap,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  type Mesh,
  type Object3D,
} from "three";

import type {
  AssetDefinition,
  BasicConnectionRoute,
  GroundBounds,
  Node,
  OpeningView,
  Visualization,
} from "@under-glass/core";
import {
  routeBasicConnections,
  validateVisualizationSemantics,
} from "@under-glass/core";

import {
  createAssetSession,
  recoverableAssetDiagnostic,
  type AssetSession,
  type PreparedNodeAsset,
} from "./asset-session.js";
import { parseGlb } from "./glb.js";
import { createLabelOverlay, type LabelOverlay } from "./label-overlay.js";
import {
  disposeObjectResourceRoots,
  disposeObjectResources,
} from "./resource-disposal.js";
import {
  createAssetPlaceholder,
  createGroundPlane,
  createPlacedAsset,
  derivePlacedFootprintGroundBounds,
  updateAssetPlaceholder,
  updateGroundPlane,
} from "./scene-layout.js";
import {
  applyOpeningView,
  createOpeningViewCamera,
  type CameraMode,
} from "./scene-camera.js";
import {
  createConnectionRoute,
  createGroupSurface,
  createInfiniteGrid,
} from "./scene-graph.js";
import { createSceneStateStore, type SceneStateStore } from "./scene-state.js";
import type {
  CreateSceneRendererOptions,
  SceneRenderer,
  SceneRendererDiagnostic,
} from "./types.js";

interface RenderingSurface {
  readonly camera: OrthographicCamera;
  readonly canvas: HTMLCanvasElement;
  cameraMode: CameraMode;
  readonly connectionLayer: Group;
  readonly container: HTMLElement;
  readonly groundPlane: Mesh;
  readonly labels: LabelOverlay;
  readonly openingView: OpeningView;
  readonly resizeObserver: ResizeObserver;
  readonly scene: Scene;
  readonly webGlRenderer: WebGLRenderer;
}

interface RendererSession {
  readonly assetDefinitionsByNode: Map<string, AssetDefinition>;
  readonly assets: AssetSession;
  readonly footprintsByNode: Map<string, GroundBounds>;
  readonly placeholders: Map<string, Mesh>;
  routes: BasicConnectionRoute[];
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
  surface.labels.render(surface.camera);
}

function resizeSurface(
  surface: RenderingSurface,
  container: HTMLElement,
): void {
  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);

  applyOpeningView(
    surface.camera,
    surface.openingView,
    surface.cameraMode,
    width,
    height,
  );
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
  const camera = createOpeningViewCamera();
  const center = visualization.openingView.center;
  const groundPlane = createGroundPlane(visualization, new Map());
  const connectionLayer = new Group();
  const labels = createLabelOverlay(container, visualization);

  canvas.dataset.underGlassRenderer = "";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.display = "block";
  canvas.style.height = "100%";
  canvas.style.width = "100%";
  container.append(canvas);

  webGlRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  webGlRenderer.outputColorSpace = SRGBColorSpace;
  webGlRenderer.shadowMap.enabled = true;
  webGlRenderer.shadowMap.type = PCFShadowMap;
  webGlRenderer.toneMapping = ACESFilmicToneMapping;
  webGlRenderer.toneMappingExposure = 1.08;
  scene.background = new Color(0x0e1311);
  scene.add(new HemisphereLight(0xe8f3ed, 0x18201d, 1.6));
  scene.add(new AmbientLight(0xffffff, 0.65));
  scene.add(groundPlane);
  scene.add(createInfiniteGrid(visualization.openingView));

  for (const group of visualization.groups) {
    scene.add(createGroupSurface(group));
  }

  connectionLayer.name = "Connections";
  scene.add(connectionLayer);

  const keyLight = new DirectionalLight(0xffffff, 3.6);
  keyLight.position.set(center.x - 6, 11, center.z + 7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.radius = 4;
  scene.add(keyLight);
  const fillLight = new DirectionalLight(0xa9d7c0, 1.1);
  fillLight.position.set(center.x + 8, 6, center.z - 8);
  scene.add(fillLight);

  container.dataset.underGlassCameraMode = visualization.openingView.cameraMode;

  const surface: RenderingSurface = {
    camera,
    canvas,
    cameraMode: visualization.openingView.cameraMode,
    connectionLayer,
    container,
    groundPlane,
    labels,
    openingView: visualization.openingView,
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

function updateGraphPresentation(
  visualization: Visualization,
  surface: RenderingSurface,
  session: RendererSession,
): void {
  for (const child of [...surface.connectionLayer.children]) {
    surface.connectionLayer.remove(child);
    disposeObjectResources(child);
  }

  session.routes = routeBasicConnections(
    visualization,
    session.footprintsByNode,
  );

  for (const route of session.routes) {
    surface.connectionLayer.add(createConnectionRoute(route));
  }

  surface.labels.setRoutes(session.routes);
  updateGroundPlane(
    surface.groundPlane,
    visualization,
    session.assetDefinitionsByNode,
    session.routes,
  );
  renderSurface(surface);
}

function applyResolvedAssetDefinition(
  node: Node,
  definition: AssetDefinition,
  context: NodeLoadContext,
): void {
  context.session.assetDefinitionsByNode.set(node.id, definition);
  context.session.footprintsByNode.set(
    node.id,
    derivePlacedFootprintGroundBounds(node, definition),
  );
  const placeholder = context.session.placeholders.get(node.id);

  if (placeholder !== undefined) {
    updateAssetPlaceholder(placeholder, node, definition);
  }

  updateGraphPresentation(
    context.options.visualization,
    context.surface,
    context.session,
  );
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
  surface.labels.dispose();
  disposeObjectResourceRoots([surface.scene, ...assetRoots]);
  surface.webGlRenderer.renderLists.dispose();
  surface.webGlRenderer.dispose();
  surface.webGlRenderer.forceContextLoss();
  surface.canvas.remove();
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
    updateGraphPresentation(options.visualization, surface, session);
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
    setCameraMode(cameraMode: CameraMode): void {
      const surface = session.surface;

      if (session.disposed || surface === null) {
        return;
      }

      surface.cameraMode = cameraMode;
      surface.container.dataset.underGlassCameraMode = cameraMode;
      resizeSurface(surface, surface.container);
    },
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
    footprintsByNode: new Map(),
    placeholders: new Map(),
    routes: [],
    disposed: false,
    surface: null,
  };

  session.surface = startSceneRendering(options, store, session);
  return createSceneRendererHandle(store, session);
}
