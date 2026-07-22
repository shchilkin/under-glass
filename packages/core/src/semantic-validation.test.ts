import { describe, expect, it } from "vitest";

import { parseVisualization, validateVisualizationSemantics } from "./index.js";

describe("validateVisualizationSemantics", () => {
  it("reports dangling Node and Group references", () => {
    const visualization = parseVisualization({
      schemaVersion: 1,
      nodes: [
        {
          id: "api",
          label: "API",
          assetId: "service",
          position: { x: 0, z: 0 },
          quarterTurns: 0,
          groupId: "missing-group",
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
        center: { x: 0, z: 0 },
        zoom: 1,
      },
    });

    expect(validateVisualizationSemantics(visualization)).toEqual([
      {
        code: "missing-group",
        entityId: "api",
        entityKind: "node",
        message: 'Node "api" references missing Group "missing-group".',
        path: ["nodes", 0, "groupId"],
      },
      {
        code: "missing-node",
        entityId: "request",
        entityKind: "connection",
        message: 'Connection "request" references missing Node "browser".',
        path: ["connections", 0, "source", "nodeId"],
      },
    ]);
  });

  it("accepts references to entities in the same Visualization", () => {
    const visualization = parseVisualization({
      schemaVersion: 1,
      nodes: [
        {
          id: "browser",
          label: "Browser",
          assetId: "browser",
          position: { x: 0, z: 0 },
          quarterTurns: 0,
          groupId: "public",
        },
        {
          id: "api",
          label: "API",
          assetId: "service",
          position: { x: 2, z: 0 },
          quarterTurns: 0,
        },
      ],
      groups: [
        {
          id: "public",
          bounds: { minX: -1, minZ: -1, maxX: 1, maxZ: 1 },
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
        cameraMode: "top",
        quarterTurns: 0,
        center: { x: 1, z: 0 },
        zoom: 1,
      },
    });

    expect(validateVisualizationSemantics(visualization)).toEqual([]);
  });
});
