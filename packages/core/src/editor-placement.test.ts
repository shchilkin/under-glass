import { describe, expect, it } from "vitest";

import type { GroundBounds, Visualization } from "./visualization.js";
import { evaluateNodePlacement, snapGroundPoint } from "./editor-placement.js";

const VISUALIZATION = {
  schemaVersion: 1,
  nodes: [
    {
      id: "source",
      label: "Source",
      assetId: "service",
      position: { x: 0, z: 0 },
      quarterTurns: 0,
    },
    {
      id: "target",
      label: "Target",
      assetId: "service",
      position: { x: 4, z: 0 },
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

const FOOTPRINTS = new Map<string, GroundBounds>([
  ["source", { minX: -1, minZ: -0.5, maxX: 1, maxZ: 0.5 }],
  ["target", { minX: 3, minZ: -1, maxX: 5, maxZ: 1 }],
]);

describe("Editor placement", () => {
  it("snaps to a configurable Grid step without changing stored precision rules", () => {
    expect(snapGroundPoint({ x: 1.24, z: -1.26 }, 0.5)).toEqual({
      x: 1,
      z: -1.5,
    });
    expect(snapGroundPoint({ x: 1.24, z: -1.26 }, null)).toEqual({
      x: 1.24,
      z: -1.26,
    });
  });

  it("accepts a snapped position whose translated footprint remains clear", () => {
    expect(
      evaluateNodePlacement({
        footprintsByNode: FOOTPRINTS,
        gridStep: 1,
        nodeId: "source",
        target: { x: 1.4, z: 2.4 },
        visualization: VISUALIZATION,
      }),
    ).toEqual({
      conflictingNodeIds: [],
      nodeId: "source",
      position: { x: 1, z: 2 },
      valid: true,
    });
  });

  it("rejects positive-area footprint overlap but permits touching edges", () => {
    expect(
      evaluateNodePlacement({
        footprintsByNode: FOOTPRINTS,
        gridStep: null,
        nodeId: "source",
        target: { x: 3, z: 0 },
        visualization: VISUALIZATION,
      }),
    ).toMatchObject({
      conflictingNodeIds: ["target"],
      valid: false,
    });
    expect(
      evaluateNodePlacement({
        footprintsByNode: FOOTPRINTS,
        gridStep: null,
        nodeId: "source",
        target: { x: 1, z: 0 },
        visualization: VISUALIZATION,
      }),
    ).toMatchObject({
      conflictingNodeIds: [],
      valid: true,
    });
  });
});
