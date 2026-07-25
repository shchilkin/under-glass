import { describe, expect, it } from "vitest";

import {
  STRESS_NODE_COUNT,
  stressVisualization,
} from "./stress-visualization.js";

describe("stressVisualization", () => {
  it("defines a deterministic 200-Node cache and resource fixture", () => {
    expect(STRESS_NODE_COUNT).toBe(200);
    expect(stressVisualization.nodes).toHaveLength(200);
    expect(new Set(stressVisualization.nodes.map((node) => node.id)).size).toBe(
      200,
    );
    expect(
      new Set(stressVisualization.nodes.map((node) => node.assetId)),
    ).toEqual(new Set(["service-asset"]));
    expect(
      new Set(
        stressVisualization.nodes.map(
          (node) => `${node.position.x}:${node.position.z}`,
        ),
      ).size,
    ).toBe(200);
    expect(stressVisualization.nodes[0]).toMatchObject({
      id: "stress-node-001",
      position: { x: -19, z: -9 },
    });
    expect(stressVisualization.nodes[19]).toMatchObject({
      id: "stress-node-020",
      position: { x: 19, z: -9 },
    });
    expect(stressVisualization.nodes[199]).toMatchObject({
      id: "stress-node-200",
      position: { x: 19, z: 9 },
    });
    expect(stressVisualization.groups).toEqual([]);
    expect(stressVisualization.connections).toEqual([]);
    expect(stressVisualization.openingView).toEqual({
      cameraMode: "isometric",
      center: { x: 0, z: 0 },
      groundSpan: 46,
      quarterTurns: 0,
    });
  });
});
