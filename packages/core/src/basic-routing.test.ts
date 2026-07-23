import { describe, expect, it } from "vitest";

import {
  deriveVisualizationBounds,
  parseVisualization,
  routeBasicConnections,
  type GroundBounds,
} from "./index.js";

describe("routeBasicConnections", () => {
  it("derives deterministic footprint ports and an orthogonal route", () => {
    const visualization = parseVisualization({
      schemaVersion: 1,
      nodes: [
        {
          id: "browser",
          label: "Browser",
          assetId: "browser",
          position: { x: 0, z: 0 },
          quarterTurns: 0,
        },
        {
          id: "api",
          label: "API",
          assetId: "service",
          position: { x: 6, z: 4 },
          quarterTurns: 0,
        },
      ],
      groups: [],
      connections: [
        {
          id: "request",
          label: "Request",
          source: { nodeId: "browser" },
          target: { nodeId: "api" },
          direction: "oneWay",
          routeAnchors: [],
        },
      ],
      openingView: {
        cameraMode: "isometric",
        quarterTurns: 0,
        center: { x: 3, z: 2 },
        groundSpan: 12,
      },
    });
    const footprints = new Map<string, GroundBounds>([
      [
        "browser",
        {
          minX: -1,
          minZ: -1,
          maxX: 1,
          maxZ: 1,
        },
      ],
      [
        "api",
        {
          minX: 5,
          minZ: 3,
          maxX: 7,
          maxZ: 5,
        },
      ],
    ]);

    expect(routeBasicConnections(visualization, footprints)).toEqual([
      {
        connectionId: "request",
        direction: "oneWay",
        label: "Request",
        points: [
          { x: 1, z: 0 },
          { x: 1.5, z: 0 },
          { x: 4.5, z: 0 },
          { x: 4.5, z: 4 },
          { x: 5, z: 4 },
        ],
        sourcePort: { x: 1, z: 0 },
        targetPort: { x: 5, z: 4 },
      },
    ]);
  });

  it("derives padded scene bounds from footprints, Groups, labels, and routes", () => {
    const visualization = parseVisualization({
      schemaVersion: 1,
      nodes: [
        {
          id: "browser",
          label: "Browser",
          assetId: "browser",
          position: { x: 0, z: 0 },
          quarterTurns: 0,
          groupId: "edge",
        },
        {
          id: "api",
          label: "API",
          assetId: "service",
          position: { x: 6, z: 4 },
          quarterTurns: 0,
        },
      ],
      groups: [
        {
          id: "edge",
          label: "Edge",
          bounds: { minX: -2, minZ: -2, maxX: 4, maxZ: 2 },
        },
      ],
      connections: [
        {
          id: "request",
          label: "Request",
          source: { nodeId: "browser" },
          target: { nodeId: "api" },
          direction: "oneWay",
          routeAnchors: [],
        },
      ],
      openingView: {
        cameraMode: "isometric",
        quarterTurns: 0,
        center: { x: 3, z: 2 },
        groundSpan: 12,
      },
    });
    const footprints = new Map<string, GroundBounds>([
      ["browser", { minX: -1, minZ: -1, maxX: 1, maxZ: 1 }],
      ["api", { minX: 5, minZ: 3, maxX: 7, maxZ: 5 }],
    ]);
    const routes = routeBasicConnections(visualization, footprints);

    expect(
      deriveVisualizationBounds(visualization, footprints, routes),
    ).toEqual({
      minX: -4,
      minZ: -4,
      maxX: 9.75,
      maxZ: 7.75,
    });
  });
});
