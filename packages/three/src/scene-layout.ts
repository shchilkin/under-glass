import {
  BoxGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
  type Object3D,
} from "three";

import type {
  AssetDefinition,
  BasicConnectionRoute,
  GroundBounds,
  Node,
  Visualization,
} from "@under-glass/core";
import { deriveVisualizationBounds } from "@under-glass/core";

interface GroundPlaneBounds {
  readonly centerX: number;
  readonly centerZ: number;
  readonly depth: number;
  readonly width: number;
}

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

export function derivePlacedFootprintGroundBounds(
  node: Node,
  definition: AssetDefinition,
): GroundBounds {
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
    minX,
    minZ,
    maxX,
    maxZ,
  };
}

function toGroundPlaneBounds(bounds: GroundBounds): GroundPlaneBounds {
  return {
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerZ: (bounds.minZ + bounds.maxZ) / 2,
    depth: bounds.maxZ - bounds.minZ,
    width: bounds.maxX - bounds.minX,
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

function deriveSceneGroundPlaneBounds(
  visualization: Visualization,
  definitionsByNode: ReadonlyMap<string, AssetDefinition>,
  routes: readonly BasicConnectionRoute[],
): GroundPlaneBounds {
  const footprintsByNode = new Map<string, GroundBounds>();

  for (const node of visualization.nodes) {
    const definition = definitionsByNode.get(node.id);

    if (definition !== undefined) {
      footprintsByNode.set(
        node.id,
        derivePlacedFootprintGroundBounds(node, definition),
      );
    }
  }

  return toGroundPlaneBounds(
    deriveVisualizationBounds(visualization, footprintsByNode, routes),
  );
}

export function createAssetPlaceholder(node: Node): Mesh {
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

export function updateAssetPlaceholder(
  placeholder: Mesh,
  node: Node,
  definition: AssetDefinition,
): void {
  const bounds = toGroundPlaneBounds(
    derivePlacedFootprintGroundBounds(node, definition),
  );

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

export function createGroundPlane(
  visualization: Visualization,
  definitionsByNode: ReadonlyMap<string, AssetDefinition>,
  routes: readonly BasicConnectionRoute[] = [],
): Mesh {
  const bounds = deriveSceneGroundPlaneBounds(
    visualization,
    definitionsByNode,
    routes,
  );
  const geometry = new PlaneGeometry(bounds.width, bounds.depth);
  const material = new MeshBasicMaterial({
    depthWrite: false,
    opacity: 0,
    transparent: true,
  });
  const groundPlane = new Mesh(geometry, material);

  groundPlane.name = "Ground Plane";
  groundPlane.position.set(bounds.centerX, -0.001, bounds.centerZ);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.receiveShadow = true;
  return groundPlane;
}

export function updateGroundPlane(
  groundPlane: Mesh,
  visualization: Visualization,
  definitionsByNode: ReadonlyMap<string, AssetDefinition>,
  routes: readonly BasicConnectionRoute[],
): void {
  const bounds = deriveSceneGroundPlaneBounds(
    visualization,
    definitionsByNode,
    routes,
  );

  groundPlane.geometry.dispose();
  groundPlane.geometry = new PlaneGeometry(bounds.width, bounds.depth);
  groundPlane.position.set(bounds.centerX, -0.001, bounds.centerZ);
}

export function createPlacedAsset(
  node: Node,
  definition: AssetDefinition,
  asset: Object3D,
): Object3D {
  const placement = new Group();

  placement.name = `Node ${node.id}`;
  placement.matrixAutoUpdate = false;
  placement.matrix.copy(createNodePlacementMatrix(node, definition));
  asset.traverse((object) => {
    if (object instanceof Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  placement.add(asset);
  return placement;
}
