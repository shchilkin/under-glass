import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";

import type { AssetDefinition, Node, Visualization } from "@under-glass/core";
import {
  validateAssetDefinitionSemantics,
  validateVisualizationSemantics,
} from "@under-glass/core";

import { parseGlb } from "./glb.js";
import {
  disposeObjectResourceRoots,
  disposeObjectResources,
} from "./resource-disposal.js";
import { createSceneStateStore, type SceneStateStore } from "./scene-state.js";
import type {
  CreateSceneRendererOptions,
  ResolvedAsset,
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
  readonly assetLoads: Map<string, AssetLoadEntry>;
  readonly cachedAssetRoots: Set<Object3D>;
  readonly pendingAssets: Set<Object3D>;
  readonly placeholders: Map<string, Mesh>;
  disposed: boolean;
  surface: RenderingSurface | null;
}

interface AssetLoadEntry {
  load(): Promise<LoadedNodeAsset | null>;
  readonly resolvedAsset: Promise<ResolvedAsset>;
}

interface LoadedNodeAsset {
  readonly asset: Object3D;
  readonly resolvedAsset: ResolvedAsset;
}

interface NodeLoadContext {
  readonly isDisposed: () => boolean;
  readonly options: CreateSceneRendererOptions;
  readonly session: RendererSession;
  readonly surface: RenderingSurface;
}

class SceneRendererDiagnosticError extends Error {
  readonly diagnostic: SceneRendererDiagnostic;

  constructor(diagnostic: SceneRendererDiagnostic) {
    super(diagnostic.message);
    this.name = "SceneRendererDiagnosticError";
    this.diagnostic = diagnostic;
  }
}

interface GroundPlaneBounds {
  readonly centerX: number;
  readonly centerZ: number;
  readonly depth: number;
  readonly width: number;
}

const GROUND_PLANE_PADDING = 2;
const PLACEHOLDER_HEIGHT = 0.75;

function createNodePlacementMatrix(
  node: Node,
  definition: AssetDefinition,
): Matrix4 {
  const rotation = definition.normalizationRotation;
  const normalizationRotation = new Quaternion(
    rotation.x,
    rotation.y,
    rotation.z,
    rotation.w,
  ).normalize();
  const nodeRotation = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    node.quarterTurns * (Math.PI / 2),
  );
  const scale = new Vector3(
    definition.scale,
    definition.scale,
    definition.scale,
  );
  const worldTransform = new Matrix4().compose(
    new Vector3(node.position.x, 0, node.position.z),
    nodeRotation.multiply(normalizationRotation),
    scale,
  );
  const groundContact = definition.groundContact;

  return worldTransform.multiply(
    new Matrix4().makeTranslation(
      -groundContact.x,
      -groundContact.y,
      -groundContact.z,
    ),
  );
}

function derivePlacedFootprintBounds(
  node: Node,
  definition: AssetDefinition,
): GroundPlaneBounds {
  const footprint = definition.footprint;
  const groundContact = definition.groundContact;
  const placementMatrix = createNodePlacementMatrix(node, definition);
  const footprintCorners: ReadonlyArray<readonly [number, number]> = [
    [footprint.minX, footprint.minZ],
    [footprint.minX, footprint.maxZ],
    [footprint.maxX, footprint.minZ],
    [footprint.maxX, footprint.maxZ],
  ];
  const worldCorners = footprintCorners.map(([x, z]) =>
    new Vector3(x, groundContact.y, z).applyMatrix4(placementMatrix),
  );
  const xCoordinates = worldCorners.map((corner) => corner.x);
  const zCoordinates = worldCorners.map((corner) => corner.z);
  const minX = Math.min(...xCoordinates);
  const maxX = Math.max(...xCoordinates);
  const minZ = Math.min(...zCoordinates);
  const maxZ = Math.max(...zCoordinates);

  return {
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    depth: maxZ - minZ,
    width: maxX - minX,
  };
}

function defaultFootprintBounds(node: Node): GroundPlaneBounds {
  return {
    centerX: node.position.x,
    centerZ: node.position.z,
    depth: 1,
    width: 1,
  };
}

function nodeFootprintBounds(
  node: Node,
  definitionsByNode: ReadonlyMap<string, AssetDefinition>,
): GroundPlaneBounds {
  const definition = definitionsByNode.get(node.id);
  return definition === undefined
    ? defaultFootprintBounds(node)
    : derivePlacedFootprintBounds(node, definition);
}

function deriveSceneGroundPlaneBounds(
  visualization: Visualization,
  definitionsByNode: ReadonlyMap<string, AssetDefinition>,
): GroundPlaneBounds {
  const nodeBounds = visualization.nodes.map((node) =>
    nodeFootprintBounds(node, definitionsByNode),
  );

  if (nodeBounds.length === 0) {
    return {
      centerX: visualization.openingView.center.x,
      centerZ: visualization.openingView.center.z,
      depth: GROUND_PLANE_PADDING * 2,
      width: GROUND_PLANE_PADDING * 2,
    };
  }

  const minX = Math.min(
    ...nodeBounds.map((bounds) => bounds.centerX - bounds.width / 2),
  );
  const maxX = Math.max(
    ...nodeBounds.map((bounds) => bounds.centerX + bounds.width / 2),
  );
  const minZ = Math.min(
    ...nodeBounds.map((bounds) => bounds.centerZ - bounds.depth / 2),
  );
  const maxZ = Math.max(
    ...nodeBounds.map((bounds) => bounds.centerZ + bounds.depth / 2),
  );

  return {
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    depth: maxZ - minZ + GROUND_PLANE_PADDING * 2,
    width: maxX - minX + GROUND_PLANE_PADDING * 2,
  };
}

function createAssetPlaceholder(node: Node): Mesh {
  const bounds = defaultFootprintBounds(node);
  const geometry = new BoxGeometry(
    bounds.width,
    PLACEHOLDER_HEIGHT,
    bounds.depth,
  );
  const material = new MeshStandardMaterial({
    color: 0xe6a85c,
    metalness: 0,
    roughness: 0.8,
  });
  const placeholder = new Mesh(geometry, material);

  placeholder.name = `Asset Placeholder ${node.id}`;
  placeholder.position.set(
    bounds.centerX,
    PLACEHOLDER_HEIGHT / 2,
    bounds.centerZ,
  );
  placeholder.castShadow = true;
  return placeholder;
}

function updateAssetPlaceholder(
  node: Node,
  definition: AssetDefinition,
  session: RendererSession,
): void {
  const placeholder = session.placeholders.get(node.id);

  if (placeholder === undefined) {
    return;
  }

  const bounds = derivePlacedFootprintBounds(node, definition);
  placeholder.geometry.dispose();
  placeholder.geometry = new BoxGeometry(
    bounds.width,
    PLACEHOLDER_HEIGHT,
    bounds.depth,
  );
  placeholder.position.set(
    bounds.centerX,
    PLACEHOLDER_HEIGHT / 2,
    bounds.centerZ,
  );
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

function createGroundPlane(
  visualization: Visualization,
  definitionsByNode: ReadonlyMap<string, AssetDefinition>,
): Mesh {
  const bounds = deriveSceneGroundPlaneBounds(visualization, definitionsByNode);
  const geometry = new PlaneGeometry(bounds.width, bounds.depth);
  const material = new MeshStandardMaterial({
    color: 0x1b2521,
    metalness: 0,
    roughness: 1,
  });
  const groundPlane = new Mesh(geometry, material);

  groundPlane.name = "Ground Plane";
  groundPlane.position.set(bounds.centerX, -0.001, bounds.centerZ);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.receiveShadow = true;
  return groundPlane;
}

function updateGroundPlane(
  surface: RenderingSurface,
  visualization: Visualization,
  definitionsByNode: ReadonlyMap<string, AssetDefinition>,
): void {
  const bounds = deriveSceneGroundPlaneBounds(visualization, definitionsByNode);

  surface.groundPlane.geometry.dispose();
  surface.groundPlane.geometry = new PlaneGeometry(bounds.width, bounds.depth);
  surface.groundPlane.position.set(bounds.centerX, -0.001, bounds.centerZ);
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

function createPlacedAsset(
  node: Node,
  definition: AssetDefinition,
  asset: Object3D,
): Object3D {
  const placement = new Group();

  placement.name = `Node ${node.id}`;
  placement.matrixAutoUpdate = false;
  placement.matrix.copy(createNodePlacementMatrix(node, definition));
  placement.add(asset);
  return placement;
}

function validateResolvedAsset(
  expectedAssetId: string,
  resolvedAsset: ResolvedAsset,
): SceneRendererDiagnostic | null {
  if (resolvedAsset.definition.assetId !== expectedAssetId) {
    return {
      code: "asset-definition-mismatch",
      entityId: expectedAssetId,
      message: `Asset Resolver returned Asset Definition "${resolvedAsset.definition.assetId}" for Asset ID "${expectedAssetId}".`,
      severity: "error",
    };
  }

  const semanticErrors = validateAssetDefinitionSemantics(
    resolvedAsset.definition,
  ).filter((diagnostic) => diagnostic.severity === "error");

  if (semanticErrors.length > 0) {
    return {
      code: "asset-load-failed",
      entityId: expectedAssetId,
      message: `Asset Definition "${expectedAssetId}" is not semantically valid.`,
      severity: "error",
    };
  }

  return null;
}

function failedAssetDiagnostic(
  node: Node,
  error: unknown,
): SceneRendererDiagnostic {
  const reason = error instanceof Error ? error.message : "Unknown error.";

  return {
    code: "asset-load-failed",
    entityId: node.id,
    message: `Node "${node.id}" could not load Asset ID "${node.assetId}": ${reason}`,
    severity: "error",
  };
}

async function resolveNodeAsset(
  node: Node,
  options: CreateSceneRendererOptions,
): Promise<ResolvedAsset> {
  const resolvedAsset = await options.resolveAsset(node.assetId);
  const validationDiagnostic = validateResolvedAsset(
    node.assetId,
    resolvedAsset,
  );

  if (validationDiagnostic !== null) {
    throw new SceneRendererDiagnosticError(validationDiagnostic);
  }

  return resolvedAsset;
}

function getAssetLoad(node: Node, context: NodeLoadContext): AssetLoadEntry {
  let assetLoad = context.session.assetLoads.get(node.assetId);

  if (assetLoad === undefined) {
    assetLoad = createAssetLoad(
      node,
      context.options,
      context.session,
      context.isDisposed,
    );
    context.session.assetLoads.set(node.assetId, assetLoad);
  }

  return assetLoad;
}

function applyResolvedAssetDefinition(
  node: Node,
  resolvedAsset: ResolvedAsset,
  context: NodeLoadContext,
): void {
  context.session.assetDefinitionsByNode.set(node.id, resolvedAsset.definition);
  updateAssetPlaceholder(node, resolvedAsset.definition, context.session);
  updateGroundPlane(
    context.surface,
    context.options.visualization,
    context.session.assetDefinitionsByNode,
  );
  renderSurface(context.surface);
}

function instantiateNodeAsset(
  loadedAsset: LoadedNodeAsset | null,
  context: NodeLoadContext,
): LoadedNodeAsset | null {
  if (loadedAsset === null || context.isDisposed()) {
    return null;
  }

  const asset = clone(loadedAsset.asset);
  context.session.pendingAssets.add(asset);
  return {
    asset,
    resolvedAsset: loadedAsset.resolvedAsset,
  };
}

async function prepareNodeAsset(
  node: Node,
  context: NodeLoadContext,
): Promise<LoadedNodeAsset | null> {
  const assetLoad = getAssetLoad(node, context);
  const resolvedAsset = await assetLoad.resolvedAsset;

  if (context.isDisposed()) {
    return null;
  }

  applyResolvedAssetDefinition(node, resolvedAsset, context);
  return instantiateNodeAsset(await assetLoad.load(), context);
}

async function parseResolvedAsset(
  resolvedAssetPromise: Promise<ResolvedAsset>,
  session: RendererSession,
  isDisposed: () => boolean,
): Promise<LoadedNodeAsset | null> {
  const resolvedAsset = await resolvedAssetPromise;

  if (isDisposed()) {
    return null;
  }

  const asset = await parseGlb(resolvedAsset.bytes);

  if (isDisposed()) {
    disposeObjectResources(asset);
    return null;
  }

  session.cachedAssetRoots.add(asset);
  return { asset, resolvedAsset };
}

function createAssetLoad(
  node: Node,
  options: CreateSceneRendererOptions,
  session: RendererSession,
  isDisposed: () => boolean,
): AssetLoadEntry {
  const resolvedAsset = resolveNodeAsset(node, options);
  let loadedAsset: Promise<LoadedNodeAsset | null> | undefined;

  return {
    load(): Promise<LoadedNodeAsset | null> {
      loadedAsset ??= parseResolvedAsset(resolvedAsset, session, isDisposed);
      return loadedAsset;
    },
    resolvedAsset,
  };
}

function completeNodeLoad(
  node: Node,
  loadedAsset: LoadedNodeAsset,
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
  loadedAsset: LoadedNodeAsset | null,
  surface: RenderingSurface,
  session: RendererSession,
  isDisposed: () => boolean,
): void {
  if (loadedAsset === null) {
    return;
  }

  if (isDisposed()) {
    session.pendingAssets.delete(loadedAsset.asset);
    return;
  }

  session.pendingAssets.delete(loadedAsset.asset);
  completeNodeLoad(node, loadedAsset, surface, session);
}

function nodeLoadDiagnostic(
  node: Node,
  error: unknown,
): SceneRendererDiagnostic {
  const diagnostic =
    error instanceof SceneRendererDiagnosticError
      ? error.diagnostic
      : failedAssetDiagnostic(node, error);

  return {
    ...diagnostic,
    entityId: node.id,
    severity: "warning",
  };
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
      diagnostics: [...snapshot.diagnostics, nodeLoadDiagnostic(node, error)],
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
  cachedAssetRoots: Iterable<Object3D>,
  pendingAssets: Iterable<Object3D>,
): void {
  surface.resizeObserver.disconnect();
  disposeObjectResourceRoots([
    surface.scene,
    ...cachedAssetRoots,
    ...pendingAssets,
  ]);
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

function fatalVisualizationDiagnostics(
  visualization: Visualization,
): SceneRendererDiagnostic[] {
  if (visualization.connections.length > 0) {
    return [unsupportedConnectionsDiagnostic(visualization.connections.length)];
  }

  return semanticDiagnostics(visualization).filter(
    (diagnostic) => diagnostic.severity === "error",
  );
}

function recoverableVisualizationDiagnostics(
  visualization: Visualization,
): SceneRendererDiagnostic[] {
  return semanticDiagnostics(visualization).filter(
    (diagnostic) => diagnostic.severity === "warning",
  );
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
  const fatalDiagnostics = fatalVisualizationDiagnostics(options.visualization);

  if (fatalDiagnostics.length > 0) {
    deferFailedLifecycle(store, fatalDiagnostics, () => session.disposed);
    return null;
  }

  try {
    const surface = createRenderingSurface(
      options.container,
      options.visualization,
    );
    const recoverableDiagnostics = recoverableVisualizationDiagnostics(
      options.visualization,
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
    disposeSurface(
      session.surface,
      session.cachedAssetRoots,
      session.pendingAssets,
    );
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
  const session: RendererSession = {
    assetDefinitionsByNode: new Map(),
    assetLoads: new Map(),
    cachedAssetRoots: new Set(),
    pendingAssets: new Set(),
    placeholders: new Map(),
    disposed: false,
    surface: null,
  };

  session.surface = startSceneRendering(options, store, session);
  return createSceneRendererHandle(store, session);
}
