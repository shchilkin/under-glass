import type {
  GroundBounds,
  GroundPoint,
  Node,
  Visualization,
} from "./visualization.js";

export interface EvaluateNodePlacementOptions {
  readonly footprintsByNode: ReadonlyMap<string, GroundBounds>;
  readonly gridStep: number | null;
  readonly nodeId: string;
  readonly target: GroundPoint;
  readonly visualization: Visualization;
}

export interface NodePlacementPreview {
  readonly conflictingNodeIds: readonly string[];
  readonly nodeId: string;
  readonly position: GroundPoint;
  readonly valid: boolean;
}

export function assertValidGridStep(gridStep: number | null): void {
  if (gridStep !== null && (!Number.isFinite(gridStep) || gridStep <= 0)) {
    throw new Error("Grid step must be a finite positive number or null.");
  }
}

export function snapGroundPoint(
  point: GroundPoint,
  gridStep: number | null,
): GroundPoint {
  assertValidGridStep(gridStep);

  if (gridStep === null) {
    return { ...point };
  }

  return {
    x: Math.round(point.x / gridStep) * gridStep,
    z: Math.round(point.z / gridStep) * gridStep,
  };
}

function defaultFootprint(node: Node): GroundBounds {
  return {
    minX: node.position.x - 0.5,
    minZ: node.position.z - 0.5,
    maxX: node.position.x + 0.5,
    maxZ: node.position.z + 0.5,
  };
}

function translateBounds(
  bounds: GroundBounds,
  from: GroundPoint,
  to: GroundPoint,
): GroundBounds {
  const deltaX = to.x - from.x;
  const deltaZ = to.z - from.z;

  return {
    minX: bounds.minX + deltaX,
    minZ: bounds.minZ + deltaZ,
    maxX: bounds.maxX + deltaX,
    maxZ: bounds.maxZ + deltaZ,
  };
}

function overlaps(first: GroundBounds, second: GroundBounds): boolean {
  return (
    first.minX < second.maxX &&
    first.maxX > second.minX &&
    first.minZ < second.maxZ &&
    first.maxZ > second.minZ
  );
}

export function evaluateNodePlacement(
  options: EvaluateNodePlacementOptions,
): NodePlacementPreview {
  const node = options.visualization.nodes.find(
    (candidate) => candidate.id === options.nodeId,
  );

  if (node === undefined) {
    throw new Error(`Cannot place missing Node "${options.nodeId}".`);
  }

  const position = snapGroundPoint(options.target, options.gridStep);
  const currentBounds =
    options.footprintsByNode.get(node.id) ?? defaultFootprint(node);
  const previewBounds = translateBounds(currentBounds, node.position, position);
  const conflictingNodeIds = options.visualization.nodes
    .filter((candidate) => candidate.id !== node.id)
    .filter((candidate) => {
      const bounds =
        options.footprintsByNode.get(candidate.id) ??
        defaultFootprint(candidate);
      return overlaps(previewBounds, bounds);
    })
    .map((candidate) => candidate.id)
    .sort((first, second) => first.localeCompare(second));

  return {
    conflictingNodeIds,
    nodeId: node.id,
    position,
    valid: conflictingNodeIds.length === 0,
  };
}
