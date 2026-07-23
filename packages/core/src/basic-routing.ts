import type {
  Connection,
  GroundBounds,
  GroundPoint,
  Node,
  Visualization,
} from "./visualization.js";

export interface BasicConnectionRoute {
  readonly connectionId: string;
  readonly direction: Connection["direction"];
  readonly label: string;
  readonly points: readonly GroundPoint[];
  readonly sourcePort: GroundPoint;
  readonly styleKey?: string;
  readonly targetPort: GroundPoint;
}

const DEFAULT_FOOTPRINT_HALF_SPAN = 0.5;
const ENTRY_SEGMENT_LENGTH = 0.5;
const GROUND_PLANE_PADDING = 2;
const NODE_LABEL_GROUND_MARGIN = 0.75;

function defaultFootprint(node: Node): GroundBounds {
  return {
    minX: node.position.x - DEFAULT_FOOTPRINT_HALF_SPAN,
    minZ: node.position.z - DEFAULT_FOOTPRINT_HALF_SPAN,
    maxX: node.position.x + DEFAULT_FOOTPRINT_HALF_SPAN,
    maxZ: node.position.z + DEFAULT_FOOTPRINT_HALF_SPAN,
  };
}

function center(bounds: GroundBounds): GroundPoint {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2,
  };
}

interface PortPair {
  readonly sourceEntry: GroundPoint;
  readonly sourcePort: GroundPoint;
  readonly targetEntry: GroundPoint;
  readonly targetPort: GroundPoint;
  readonly exitsAlongX: boolean;
}

function derivePortPair(source: GroundBounds, target: GroundBounds): PortPair {
  const sourceCenter = center(source);
  const targetCenter = center(target);
  const deltaX = targetCenter.x - sourceCenter.x;
  const deltaZ = targetCenter.z - sourceCenter.z;

  if (Math.abs(deltaX) >= Math.abs(deltaZ)) {
    const direction = deltaX >= 0 ? 1 : -1;
    const sourceX = direction > 0 ? source.maxX : source.minX;
    const targetX = direction > 0 ? target.minX : target.maxX;
    return {
      exitsAlongX: true,
      sourcePort: { x: sourceX, z: sourceCenter.z },
      sourceEntry: {
        x: sourceX + direction * ENTRY_SEGMENT_LENGTH,
        z: sourceCenter.z,
      },
      targetEntry: {
        x: targetX - direction * ENTRY_SEGMENT_LENGTH,
        z: targetCenter.z,
      },
      targetPort: { x: targetX, z: targetCenter.z },
    };
  }

  const direction = deltaZ >= 0 ? 1 : -1;
  const sourceZ = direction > 0 ? source.maxZ : source.minZ;
  const targetZ = direction > 0 ? target.minZ : target.maxZ;
  return {
    exitsAlongX: false,
    sourcePort: { x: sourceCenter.x, z: sourceZ },
    sourceEntry: {
      x: sourceCenter.x,
      z: sourceZ + direction * ENTRY_SEGMENT_LENGTH,
    },
    targetEntry: {
      x: targetCenter.x,
      z: targetZ - direction * ENTRY_SEGMENT_LENGTH,
    },
    targetPort: { x: targetCenter.x, z: targetZ },
  };
}

function samePoint(first: GroundPoint, second: GroundPoint): boolean {
  return first.x === second.x && first.z === second.z;
}

function removeConsecutiveDuplicates(
  points: readonly GroundPoint[],
): GroundPoint[] {
  return points.filter(
    (point, index) => index === 0 || !samePoint(point, points[index - 1]!),
  );
}

function routePoints(ports: PortPair): GroundPoint[] {
  const bend = ports.exitsAlongX
    ? { x: ports.targetEntry.x, z: ports.sourceEntry.z }
    : { x: ports.sourceEntry.x, z: ports.targetEntry.z };

  return removeConsecutiveDuplicates([
    ports.sourcePort,
    ports.sourceEntry,
    bend,
    ports.targetEntry,
    ports.targetPort,
  ]);
}

export function routeBasicConnections(
  visualization: Visualization,
  footprintsByNode: ReadonlyMap<string, GroundBounds>,
): BasicConnectionRoute[] {
  const nodesById = new Map(
    visualization.nodes.map((node) => [node.id, node] as const),
  );
  const routes: BasicConnectionRoute[] = [];

  for (const connection of visualization.connections) {
    const sourceNode = nodesById.get(connection.source.nodeId);
    const targetNode = nodesById.get(connection.target.nodeId);

    if (sourceNode === undefined || targetNode === undefined) {
      continue;
    }

    const ports = derivePortPair(
      footprintsByNode.get(sourceNode.id) ?? defaultFootprint(sourceNode),
      footprintsByNode.get(targetNode.id) ?? defaultFootprint(targetNode),
    );

    routes.push({
      connectionId: connection.id,
      direction: connection.direction,
      label: connection.label,
      points: routePoints(ports),
      sourcePort: ports.sourcePort,
      ...(connection.styleKey === undefined
        ? {}
        : { styleKey: connection.styleKey }),
      targetPort: ports.targetPort,
    });
  }

  return routes;
}

function expandedNodeBounds(bounds: GroundBounds): GroundBounds {
  return {
    minX: bounds.minX - NODE_LABEL_GROUND_MARGIN,
    minZ: bounds.minZ - NODE_LABEL_GROUND_MARGIN,
    maxX: bounds.maxX + NODE_LABEL_GROUND_MARGIN,
    maxZ: bounds.maxZ + NODE_LABEL_GROUND_MARGIN,
  };
}

export function deriveVisualizationBounds(
  visualization: Visualization,
  footprintsByNode: ReadonlyMap<string, GroundBounds>,
  routes: readonly BasicConnectionRoute[],
): GroundBounds {
  const bounds: GroundBounds[] = [
    ...visualization.nodes.map((node) =>
      expandedNodeBounds(
        footprintsByNode.get(node.id) ?? defaultFootprint(node),
      ),
    ),
    ...visualization.groups.map((group) => group.bounds),
    ...routes.flatMap((route) =>
      route.points.map((point) => ({
        minX: point.x,
        minZ: point.z,
        maxX: point.x,
        maxZ: point.z,
      })),
    ),
  ];

  if (bounds.length === 0) {
    const center = visualization.openingView.center;
    return {
      minX: center.x - GROUND_PLANE_PADDING,
      minZ: center.z - GROUND_PLANE_PADDING,
      maxX: center.x + GROUND_PLANE_PADDING,
      maxZ: center.z + GROUND_PLANE_PADDING,
    };
  }

  return {
    minX:
      Math.min(...bounds.map((candidate) => candidate.minX)) -
      GROUND_PLANE_PADDING,
    minZ:
      Math.min(...bounds.map((candidate) => candidate.minZ)) -
      GROUND_PLANE_PADDING,
    maxX:
      Math.max(...bounds.map((candidate) => candidate.maxX)) +
      GROUND_PLANE_PADDING,
    maxZ:
      Math.max(...bounds.map((candidate) => candidate.maxZ)) +
      GROUND_PLANE_PADDING,
  };
}
