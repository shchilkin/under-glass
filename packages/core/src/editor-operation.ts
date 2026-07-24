import { groundPointsEqual } from "./geometry.js";
import type { GroundPoint, Visualization } from "./visualization.js";

export interface MoveNodeOperation {
  readonly from: GroundPoint;
  readonly kind: "moveNode";
  readonly nodeId: string;
  readonly to: GroundPoint;
}

export function applyMoveNodeOperation(
  visualization: Visualization,
  operation: MoveNodeOperation,
): Visualization {
  const nodeIndex = visualization.nodes.findIndex(
    (node) => node.id === operation.nodeId,
  );
  const node = visualization.nodes[nodeIndex];

  if (node === undefined) {
    throw new Error(
      `Move Node Operation references missing Node "${operation.nodeId}".`,
    );
  }

  if (!groundPointsEqual(node.position, operation.from)) {
    throw new Error(
      `Move Node Operation for "${operation.nodeId}" does not match its originating position.`,
    );
  }

  const nodes = [...visualization.nodes];
  nodes[nodeIndex] = {
    ...node,
    position: { ...operation.to },
  };
  return {
    ...visualization,
    nodes,
  };
}

export function invertMoveNodeOperation(
  operation: MoveNodeOperation,
): MoveNodeOperation {
  return {
    ...operation,
    from: operation.to,
    to: operation.from,
  };
}
