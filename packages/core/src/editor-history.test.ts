import { describe, expect, it } from "vitest";

import type { Visualization } from "./visualization.js";
import { createEditorOperationHistory } from "./editor-history.js";
import type { MoveNodeOperation } from "./editor-operation.js";

const VISUALIZATION = {
  schemaVersion: 1,
  nodes: [
    {
      id: "web",
      label: "Web",
      assetId: "service",
      position: { x: 0, z: 0 },
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

function move(fromX: number, toX: number): MoveNodeOperation {
  return {
    kind: "moveNode",
    nodeId: "web",
    from: { x: fromX, z: 0 },
    to: { x: toX, z: 0 },
  };
}

describe("Editor Operation history", () => {
  it("commits, undoes, and redoes a completed Move Node Operation", () => {
    const history = createEditorOperationHistory();
    const committed = history.commit(VISUALIZATION, move(0, 2));
    const undone = history.undo(committed);
    const redone = undone === null ? null : history.redo(undone.visualization);

    expect(committed.nodes[0]?.position).toEqual({ x: 2, z: 0 });
    expect(undone).toMatchObject({
      source: "undo",
      operation: {
        from: { x: 2, z: 0 },
        to: { x: 0, z: 0 },
      },
      visualization: {
        nodes: [{ position: { x: 0, z: 0 } }],
      },
    });
    expect(redone).toMatchObject({
      source: "redo",
      operation: {
        from: { x: 0, z: 0 },
        to: { x: 2, z: 0 },
      },
      visualization: {
        nodes: [{ position: { x: 2, z: 0 } }],
      },
    });
  });

  it("clears the redo frontier after a new completed Operation", () => {
    const history = createEditorOperationHistory();
    const first = history.commit(VISUALIZATION, move(0, 1));
    const undone = history.undo(first);

    if (undone === null) {
      throw new Error("Expected one undo transition.");
    }

    history.commit(undone.visualization, move(0, 3));

    expect(history.getSnapshot()).toEqual({
      canRedo: false,
      canUndo: true,
    });
    expect(history.redo(undone.visualization)).toBeNull();
  });

  it("bounds retained session history", () => {
    const history = createEditorOperationHistory({ capacity: 2 });
    let visualization: Visualization = VISUALIZATION;

    for (const [from, to] of [
      [0, 1],
      [1, 2],
      [2, 3],
    ] as const) {
      visualization = history.commit(visualization, move(from, to));
    }

    const firstUndo = history.undo(visualization);
    const secondUndo =
      firstUndo === null ? null : history.undo(firstUndo.visualization);
    const thirdUndo =
      secondUndo === null ? null : history.undo(secondUndo.visualization);

    expect(secondUndo?.visualization.nodes[0]?.position).toEqual({
      x: 1,
      z: 0,
    });
    expect(thirdUndo).toBeNull();
  });
});
