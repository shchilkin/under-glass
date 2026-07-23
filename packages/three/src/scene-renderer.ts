import {
  AmbientLight,
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

import type { AssetDefinition, Node, Visualization } from "@under-glass/core";
import { validateAssetDefinitionSemantics } from "@under-glass/core";

import { parseGlb } from "./glb.js";
import { disposeObjectResources } from "./resource-disposal.js";
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
  readonly resizeObserver: ResizeObserver;
  readonly scene: Scene;
  readonly webGlRenderer: WebGLRenderer;
}

interface RendererSession {
  disposed: boolean;
  surface: RenderingSurface | null;
}

interface LoadedNodeAsset {
  readonly asset: Object3D;
  readonly resolvedAsset: ResolvedAsset;
}

type RenderableNodeResult =
  | {
      readonly diagnostic: SceneRendererDiagnostic;
    }
  | {
      readonly node: Node;
    };

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

function deriveGroundPlaneBounds(
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
    depth: maxZ - minZ + GROUND_PLANE_PADDING * 2,
    width: maxX - minX + GROUND_PLANE_PADDING * 2,
  };
}

function createGroundPlane(node: Node, definition: AssetDefinition): Mesh {
  const bounds = deriveGroundPlaneBounds(node, definition);
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

  const keyLight = new DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(center.x + 4, 7, center.z + 5);
  scene.add(keyLight);

  camera.position.set(center.x + 5, 4.5, center.z + 6);
  camera.lookAt(center.x, 0, center.z);

  const surface: RenderingSurface = {
    camera,
    canvas,
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

async function prepareNodeAsset(
  node: Node,
  options: CreateSceneRendererOptions,
  surface: RenderingSurface,
  isDisposed: () => boolean,
): Promise<LoadedNodeAsset | null> {
  const resolvedAsset = await resolveNodeAsset(node, options);

  if (isDisposed()) {
    return null;
  }

  surface.scene.add(createGroundPlane(node, resolvedAsset.definition));
  renderSurface(surface);
  const asset = await parseGlb(resolvedAsset.bytes);

  if (isDisposed()) {
    disposeObjectResources(asset);
    return null;
  }

  return { asset, resolvedAsset };
}

function completeNodeLoad(
  node: Node,
  loadedAsset: LoadedNodeAsset,
  surface: RenderingSurface,
  store: SceneStateStore,
): void {
  surface.scene.add(
    createPlacedAsset(
      node,
      loadedAsset.resolvedAsset.definition,
      loadedAsset.asset,
    ),
  );
  renderSurface(surface);
  store.setSnapshot({ diagnostics: [], status: "ready" });
}

function completePreparedNodeLoad(
  node: Node,
  loadedAsset: LoadedNodeAsset | null,
  surface: RenderingSurface,
  store: SceneStateStore,
  isDisposed: () => boolean,
): void {
  if (loadedAsset === null) {
    return;
  }

  if (isDisposed()) {
    disposeObjectResources(loadedAsset.asset);
    return;
  }

  completeNodeLoad(node, loadedAsset, surface, store);
}

function nodeLoadDiagnostic(
  node: Node,
  error: unknown,
): SceneRendererDiagnostic {
  return error instanceof SceneRendererDiagnosticError
    ? error.diagnostic
    : failedAssetDiagnostic(node, error);
}

function failNodeLoad(
  node: Node,
  error: unknown,
  store: SceneStateStore,
  isDisposed: () => boolean,
): void {
  if (!isDisposed()) {
    store.setSnapshot({
      diagnostics: [nodeLoadDiagnostic(node, error)],
      status: "failed",
    });
  }
}

async function loadNode(
  node: Node,
  options: CreateSceneRendererOptions,
  surface: RenderingSurface,
  store: SceneStateStore,
  isDisposed: () => boolean,
): Promise<void> {
  try {
    const loadedAsset = await prepareNodeAsset(
      node,
      options,
      surface,
      isDisposed,
    );

    completePreparedNodeLoad(node, loadedAsset, surface, store, isDisposed);
  } catch (error) {
    failNodeLoad(node, error, store, isDisposed);
  }
}

function disposeSurface(surface: RenderingSurface): void {
  surface.resizeObserver.disconnect();
  disposeObjectResources(surface.scene);
  surface.webGlRenderer.renderLists.dispose();
  surface.webGlRenderer.dispose();
  surface.webGlRenderer.forceContextLoss();
  surface.canvas.remove();
}

function unsupportedNodeCountDiagnostic(
  nodeCount: number,
): SceneRendererDiagnostic {
  return {
    code: "unsupported-node-count",
    message: `This renderer slice requires exactly one Node; received ${nodeCount}.`,
    severity: "error",
  };
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
  diagnostic: SceneRendererDiagnostic,
  isDisposed: () => boolean,
): void {
  queueMicrotask(() => {
    if (!isDisposed()) {
      store.setSnapshot({
        diagnostics: [diagnostic],
        status: "failed",
      });
    }
  });
}

function findRenderableNode(
  visualization: Visualization,
): RenderableNodeResult {
  const [node] = visualization.nodes;

  if (node === undefined || visualization.nodes.length !== 1) {
    return {
      diagnostic: unsupportedNodeCountDiagnostic(visualization.nodes.length),
    };
  }

  if (visualization.connections.length > 0) {
    return {
      diagnostic: unsupportedConnectionsDiagnostic(
        visualization.connections.length,
      ),
    };
  }

  return { node };
}

function startSceneRendering(
  options: CreateSceneRendererOptions,
  store: SceneStateStore,
  session: RendererSession,
): RenderingSurface | null {
  const renderableNode = findRenderableNode(options.visualization);

  if ("diagnostic" in renderableNode) {
    deferFailedLifecycle(
      store,
      renderableNode.diagnostic,
      () => session.disposed,
    );
    return null;
  }

  try {
    const surface = createRenderingSurface(
      options.container,
      options.visualization,
    );
    void loadNode(renderableNode.node, options, surface, store, () => {
      return session.disposed;
    });
    return surface;
  } catch (error) {
    deferFailedLifecycle(
      store,
      rendererUnavailableDiagnostic(error),
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
    disposeSurface(session.surface);
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
    disposed: false,
    surface: null,
  };

  session.surface = startSceneRendering(options, store, session);
  return createSceneRendererHandle(store, session);
}
