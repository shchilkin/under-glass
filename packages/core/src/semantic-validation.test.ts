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
        groundSpan: 12,
      },
    });

    expect(validateVisualizationSemantics(visualization)).toEqual([
      {
        code: "missing-group",
        entityId: "api",
        entityKind: "node",
        message: 'Node "api" references missing Group "missing-group".',
        path: ["nodes", 0, "groupId"],
        severity: "error",
      },
      {
        code: "missing-node",
        entityId: "request",
        entityKind: "connection",
        message: 'Connection "request" references missing Node "browser".',
        path: ["connections", 0, "source", "nodeId"],
        severity: "error",
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
        groundSpan: 12,
      },
    });

    expect(validateVisualizationSemantics(visualization)).toEqual([]);
  });

  it("reports the later declaration of a duplicate Node ID", () => {
    const visualization = parseVisualization({
      schemaVersion: 1,
      nodes: [
        {
          id: "api",
          label: "API",
          assetId: "service",
          position: { x: 0, z: 0 },
          quarterTurns: 0,
        },
        {
          id: "api",
          label: "API replica",
          assetId: "service",
          position: { x: 2, z: 0 },
          quarterTurns: 0,
        },
      ],
      groups: [],
      connections: [],
      openingView: {
        cameraMode: "isometric",
        quarterTurns: 0,
        center: { x: 1, z: 0 },
        groundSpan: 12,
      },
    });

    expect(validateVisualizationSemantics(visualization)).toEqual([
      {
        code: "duplicate-id",
        severity: "error",
        entityId: "api",
        entityKind: "node",
        message: 'Node ID "api" is declared more than once.',
        path: ["nodes", 1, "id"],
      },
    ]);
  });

  it("reports a Node outside its saved Group Bounds without repairing it", () => {
    const visualization = parseVisualization({
      schemaVersion: 1,
      nodes: [
        {
          id: "api",
          label: "API",
          assetId: "service",
          position: { x: 3, z: 0 },
          quarterTurns: 0,
          groupId: "private",
        },
      ],
      groups: [
        {
          id: "private",
          bounds: { minX: -1, minZ: -1, maxX: 1, maxZ: 1 },
        },
      ],
      connections: [],
      openingView: {
        cameraMode: "isometric",
        quarterTurns: 0,
        center: { x: 0, z: 0 },
        groundSpan: 12,
      },
    });
    const original = structuredClone(visualization);

    expect(validateVisualizationSemantics(visualization)).toEqual([
      {
        code: "node-outside-group-bounds",
        severity: "warning",
        entityId: "api",
        entityKind: "node",
        message: 'Node "api" is outside Group "private" bounds.',
        path: ["nodes", 0, "position"],
      },
    ]);
    expect(visualization).toEqual(original);
  });

  it("reports the later declaration of a duplicate Group ID", () => {
    const visualization = parseVisualization({
      schemaVersion: 1,
      nodes: [],
      groups: [
        {
          id: "private",
          bounds: { minX: -2, minZ: -2, maxX: 2, maxZ: 2 },
        },
        {
          id: "private",
          bounds: { minX: -1, minZ: -1, maxX: 1, maxZ: 1 },
        },
      ],
      connections: [],
      openingView: {
        cameraMode: "top",
        quarterTurns: 0,
        center: { x: 0, z: 0 },
        groundSpan: 12,
      },
    });

    expect(validateVisualizationSemantics(visualization)).toEqual([
      {
        code: "duplicate-id",
        severity: "error",
        entityId: "private",
        entityKind: "group",
        message: 'Group ID "private" is declared more than once.',
        path: ["groups", 1, "id"],
      },
    ]);
  });

  it("reports the later declaration of a duplicate Connection ID", () => {
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
          position: { x: 2, z: 0 },
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
        {
          id: "request",
          label: "Retry",
          source: { nodeId: "browser" },
          target: { nodeId: "api" },
          direction: "oneWay",
          routeAnchors: [],
        },
      ],
      openingView: {
        cameraMode: "isometric",
        quarterTurns: 0,
        center: { x: 1, z: 0 },
        groundSpan: 12,
      },
    });

    expect(validateVisualizationSemantics(visualization)).toEqual([
      {
        code: "duplicate-id",
        severity: "error",
        entityId: "request",
        entityKind: "connection",
        message: 'Connection ID "request" is declared more than once.',
        path: ["connections", 1, "id"],
      },
    ]);
  });

  it("reports the later duplicate Route Anchor ID within a Connection", () => {
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
          position: { x: 2, z: 0 },
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
          routeAnchors: [
            { id: "bend", position: { x: 0.5, z: 1 } },
            { id: "bend", position: { x: 1.5, z: 1 } },
          ],
        },
      ],
      openingView: {
        cameraMode: "isometric",
        quarterTurns: 0,
        center: { x: 1, z: 0 },
        groundSpan: 12,
      },
    });

    expect(validateVisualizationSemantics(visualization)).toEqual([
      {
        code: "duplicate-id",
        severity: "error",
        entityId: "bend",
        entityKind: "route-anchor",
        message:
          'Route Anchor ID "bend" is declared more than once in Connection "request".',
        path: ["connections", 0, "routeAnchors", 1, "id"],
      },
    ]);
  });

  it("reports Group Bounds without positive rectangular area", () => {
    const visualization = parseVisualization({
      schemaVersion: 1,
      nodes: [],
      groups: [
        {
          id: "private",
          bounds: { minX: 1, minZ: -1, maxX: 1, maxZ: 1 },
        },
      ],
      connections: [],
      openingView: {
        cameraMode: "top",
        quarterTurns: 0,
        center: { x: 0, z: 0 },
        groundSpan: 12,
      },
    });

    expect(validateVisualizationSemantics(visualization)).toEqual([
      {
        code: "invalid-group-bounds",
        severity: "error",
        entityId: "private",
        entityKind: "group",
        message: 'Group "private" bounds must have positive width and depth.',
        path: ["groups", 0, "bounds"],
      },
    ]);
  });
});
