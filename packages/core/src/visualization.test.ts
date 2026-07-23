import { describe, expect, it } from "vitest";

import { parseVisualization, safeParseVisualization } from "./index.js";

describe("parseVisualization", () => {
  it("accepts the smallest valid version 1 Visualization", () => {
    const input = {
      schemaVersion: 1,
      nodes: [],
      groups: [],
      connections: [],
      openingView: {
        cameraMode: "isometric",
        quarterTurns: 0,
        center: { x: 0, z: 0 },
        groundSpan: 12,
      },
    };

    expect(parseVisualization(input)).toEqual(input);
  });

  it("rejects a Node without its required spatial identity", () => {
    expect(() =>
      parseVisualization({
        schemaVersion: 1,
        nodes: [{ id: "api" }],
        groups: [],
        connections: [],
        openingView: {
          cameraMode: "top",
          quarterTurns: 0,
          center: { x: 0, z: 0 },
          groundSpan: 12,
        },
      }),
    ).toThrow();
  });

  it("rejects a Group without saved Ground Plane bounds", () => {
    expect(() =>
      parseVisualization({
        schemaVersion: 1,
        nodes: [],
        groups: [{ id: "private-network", label: "Private network" }],
        connections: [],
        openingView: {
          cameraMode: "isometric",
          quarterTurns: 0,
          center: { x: 0, z: 0 },
          groundSpan: 12,
        },
      }),
    ).toThrow();
  });

  it("rejects a Connection without structurally complete endpoints", () => {
    expect(() =>
      parseVisualization({
        schemaVersion: 1,
        nodes: [],
        groups: [],
        connections: [{ id: "request", label: "Request" }],
        openingView: {
          cameraMode: "isometric",
          quarterTurns: 0,
          center: { x: 0, z: 0 },
          groundSpan: 12,
        },
      }),
    ).toThrow();
  });

  it("rejects host metadata that cannot be persisted as JSON", () => {
    expect(() =>
      parseVisualization({
        schemaVersion: 1,
        nodes: [
          {
            id: "api",
            label: "API",
            assetId: "service",
            position: { x: 0, z: 0 },
            quarterTurns: 0,
            metadata: { onSelect: () => undefined },
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
      }),
    ).toThrow();
  });

  it("rejects a non-Visualization JSON value", () => {
    expect(() => parseVisualization("not-a-visualization")).toThrow();
  });

  it("rejects an unsupported future schema version", () => {
    expect(() =>
      parseVisualization({
        schemaVersion: 2,
        nodes: [],
        groups: [],
        connections: [],
        openingView: {
          cameraMode: "isometric",
          quarterTurns: 0,
          center: { x: 0, z: 0 },
          groundSpan: 12,
        },
      }),
    ).toThrow();
  });

  it("reports an unsupported future version with stable diagnostics", () => {
    expect(
      safeParseVisualization({
        schemaVersion: 2,
        nodes: [],
        groups: [],
        connections: [],
        openingView: {
          cameraMode: "isometric",
          quarterTurns: 0,
          center: { x: 0, z: 0 },
          groundSpan: 12,
        },
      }),
    ).toEqual({
      success: false,
      diagnostics: [
        {
          code: "unsupported-schema-version",
          severity: "error",
          entityKind: "visualization",
          message: "Visualization schema version 2 is not supported.",
          path: ["schemaVersion"],
        },
      ],
    });
  });

  it("reports malformed structure with stable diagnostics", () => {
    expect(
      safeParseVisualization({
        schemaVersion: 1,
        nodes: [],
        groups: [],
        connections: [],
      }),
    ).toEqual({
      success: false,
      diagnostics: [
        {
          code: "invalid-structure",
          severity: "error",
          entityKind: "visualization",
          message:
            'Visualization has invalid structure at "openingView": expected an object.',
          path: ["openingView"],
        },
      ],
    });
  });

  it("rejects renderer-specific zoom and a non-positive Ground Span", () => {
    expect(() =>
      parseVisualization({
        schemaVersion: 1,
        nodes: [],
        groups: [],
        connections: [],
        openingView: {
          cameraMode: "isometric",
          quarterTurns: 0,
          center: { x: 0, z: 0 },
          zoom: 1,
        },
      }),
    ).toThrow();

    expect(() =>
      parseVisualization({
        schemaVersion: 1,
        nodes: [],
        groups: [],
        connections: [],
        openingView: {
          cameraMode: "isometric",
          quarterTurns: 0,
          center: { x: 0, z: 0 },
          groundSpan: 0,
        },
      }),
    ).toThrow();
  });
});
