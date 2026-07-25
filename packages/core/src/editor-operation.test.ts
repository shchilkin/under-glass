import { describe, expect, it } from "vitest";

import type { Visualization } from "./visualization.js";
import {
  applyMoveNodeOperation,
  invertMoveNodeOperation,
  type MoveNodeOperation,
} from "./editor-operation.js";

const VISUALIZATION = {
  schemaVersion: 1,
  nodes: [
    {
      id: "web",
      label: "Web",
      assetId: "service",
      position: { x: 1, z: 2 },
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

const MOVE = {
  kind: "moveNode",
  nodeId: "web",
  from: { x: 1, z: 2 },
  to: { x: 4, z: -1 },
} satisfies MoveNodeOperation;

describe("MoveNodeOperation", () => {
  it("applies and inverts one deterministic Node move", () => {
    const moved = applyMoveNodeOperation(VISUALIZATION, MOVE);

    expect(moved).not.toBe(VISUALIZATION);
    expect(moved.nodes[0]?.position).toEqual({ x: 4, z: -1 });
    expect(
      applyMoveNodeOperation(moved, invertMoveNodeOperation(MOVE)),
    ).toEqual(VISUALIZATION);
  });

  it("rejects an operation against a different originating snapshot", () => {
    expect(() =>
      applyMoveNodeOperation(
        {
          ...VISUALIZATION,
          nodes: [
            {
              ...VISUALIZATION.nodes[0]!,
              position: { x: 2, z: 2 },
            },
          ],
        },
        MOVE,
      ),
    ).toThrow(/originating position/);
  });

  it("rejects an unknown Node ID", () => {
    expect(() =>
      applyMoveNodeOperation(VISUALIZATION, {
        ...MOVE,
        nodeId: "missing",
      }),
    ).toThrow(/missing/);
  });
});
