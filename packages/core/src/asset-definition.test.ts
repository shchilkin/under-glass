import { describe, expect, it } from "vitest";

import {
  parseAssetDefinition,
  safeParseAssetDefinition,
  validateAssetDefinitionSemantics,
} from "./index.js";

describe("parseAssetDefinition", () => {
  it("accepts a portable version 1 Asset Definition", () => {
    const input = {
      schemaVersion: 1,
      assetId: "service",
      scale: 1.25,
      normalizationRotation: { x: 0, y: 0, z: 0, w: 1 },
      groundContact: { x: 0, y: -0.5, z: 0 },
      footprint: { minX: -1, minZ: -0.75, maxX: 1, maxZ: 0.75 },
      provenance: {
        license: "CC0-1.0",
        source: "https://example.com/assets/service",
        author: "Example Studio",
        copyright: "Example Studio",
      },
      connectionPorts: [
        {
          id: "input",
          position: { x: -1, y: 0, z: 0 },
          normal: { x: -1, z: 0 },
        },
      ],
    };

    expect(parseAssetDefinition(input)).toEqual(input);
  });

  it("rejects non-Asset Definition and unsupported future inputs", () => {
    expect(() => parseAssetDefinition("not-an-asset-definition")).toThrow();
    expect(() =>
      parseAssetDefinition({
        schemaVersion: 2,
        assetId: "service",
        scale: 1,
        normalizationRotation: { x: 0, y: 0, z: 0, w: 1 },
        groundContact: { x: 0, y: 0, z: 0 },
        footprint: { minX: -1, minZ: -1, maxX: 1, maxZ: 1 },
        provenance: {
          license: "CC0-1.0",
          source: "https://example.com/assets/service",
        },
      }),
    ).toThrow();
  });

  it("rejects malformed required fields and non-JSON numbers", () => {
    expect(() =>
      parseAssetDefinition({
        schemaVersion: 1,
        assetId: "service",
        scale: 0,
        normalizationRotation: { x: 0, y: 0, z: 0, w: 1 },
        groundContact: { x: Number.NaN, y: 0, z: 0 },
        footprint: { minX: -1, minZ: -1, maxX: 1, maxZ: 1 },
        provenance: { license: "CC0-1.0" },
      }),
    ).toThrow();
  });

  it("reports an explicitly present undefined optional field as non-JSON", () => {
    expect(
      safeParseAssetDefinition({
        schemaVersion: 1,
        assetId: "service",
        scale: 1,
        normalizationRotation: { x: 0, y: 0, z: 0, w: 1 },
        groundContact: { x: 0, y: 0, z: 0 },
        footprint: { minX: -1, minZ: -1, maxX: 1, maxZ: 1 },
        provenance: {
          license: "CC0-1.0",
          source: "https://example.com/assets/service",
          author: undefined,
        },
      }),
    ).toEqual({
      success: false,
      diagnostics: [
        {
          code: "non-json-value",
          severity: "error",
          entityKind: "asset-definition",
          message:
            'Asset Definition contains a non-JSON value at "provenance.author".',
          path: ["provenance", "author"],
        },
      ],
    });
  });
});

describe("validateAssetDefinitionSemantics", () => {
  it("reports a normalization rotation that is not a unit quaternion", () => {
    const assetDefinition = parseAssetDefinition({
      schemaVersion: 1,
      assetId: "service",
      scale: 1,
      normalizationRotation: { x: 0, y: 0, z: 0, w: 2 },
      groundContact: { x: 0, y: 0, z: 0 },
      footprint: { minX: -1, minZ: -1, maxX: 1, maxZ: 1 },
      provenance: {
        license: "CC0-1.0",
        source: "https://example.com/assets/service",
      },
    });

    expect(validateAssetDefinitionSemantics(assetDefinition)).toEqual([
      {
        code: "non-unit-normalization-rotation",
        severity: "error",
        entityId: "service",
        entityKind: "asset-definition",
        message:
          'Asset Definition "service" normalization rotation must be a unit quaternion.',
        path: ["normalizationRotation"],
      },
    ]);
  });

  it("reports an Asset Footprint without positive rectangular area", () => {
    const assetDefinition = parseAssetDefinition({
      schemaVersion: 1,
      assetId: "service",
      scale: 1,
      normalizationRotation: { x: 0, y: 0, z: 0, w: 1 },
      groundContact: { x: 0, y: 0, z: 0 },
      footprint: { minX: 1, minZ: -1, maxX: 1, maxZ: 1 },
      provenance: {
        license: "CC0-1.0",
        source: "https://example.com/assets/service",
      },
    });

    expect(validateAssetDefinitionSemantics(assetDefinition)).toEqual([
      {
        code: "invalid-footprint",
        severity: "error",
        entityId: "service",
        entityKind: "asset-definition",
        message:
          'Asset Definition "service" footprint must have positive width and depth.',
        path: ["footprint"],
      },
    ]);
  });

  it("reports the later declaration of a duplicate Connection Port ID", () => {
    const assetDefinition = parseAssetDefinition({
      schemaVersion: 1,
      assetId: "service",
      scale: 1,
      normalizationRotation: { x: 0, y: 0, z: 0, w: 1 },
      groundContact: { x: 0, y: 0, z: 0 },
      footprint: { minX: -1, minZ: -1, maxX: 1, maxZ: 1 },
      provenance: {
        license: "CC0-1.0",
        source: "https://example.com/assets/service",
      },
      connectionPorts: [
        {
          id: "input",
          position: { x: -1, y: 0, z: 0 },
          normal: { x: -1, z: 0 },
        },
        {
          id: "input",
          position: { x: 1, y: 0, z: 0 },
          normal: { x: 1, z: 0 },
        },
      ],
    });

    expect(validateAssetDefinitionSemantics(assetDefinition)).toEqual([
      {
        code: "duplicate-connection-port-id",
        severity: "error",
        entityId: "input",
        entityKind: "connection-port",
        message:
          'Connection Port ID "input" is declared more than once in Asset Definition "service".',
        path: ["connectionPorts", 1, "id"],
      },
    ]);
  });

  it("reports a Connection Port normal that is not a unit Ground Plane vector", () => {
    const assetDefinition = parseAssetDefinition({
      schemaVersion: 1,
      assetId: "service",
      scale: 1,
      normalizationRotation: { x: 0, y: 0, z: 0, w: 1 },
      groundContact: { x: 0, y: 0, z: 0 },
      footprint: { minX: -1, minZ: -1, maxX: 1, maxZ: 1 },
      provenance: {
        license: "CC0-1.0",
        source: "https://example.com/assets/service",
      },
      connectionPorts: [
        {
          id: "input",
          position: { x: -1, y: 0, z: 0 },
          normal: { x: -2, z: 0 },
        },
      ],
    });

    expect(validateAssetDefinitionSemantics(assetDefinition)).toEqual([
      {
        code: "non-unit-connection-port-normal",
        severity: "error",
        entityId: "input",
        entityKind: "connection-port",
        message:
          'Connection Port "input" in Asset Definition "service" must have a unit Ground Plane normal.',
        path: ["connectionPorts", 0, "normal"],
      },
    ]);
  });

  it("reports a Connection Port normal that points into the Asset Footprint", () => {
    const assetDefinition = parseAssetDefinition({
      schemaVersion: 1,
      assetId: "service",
      scale: 1,
      normalizationRotation: { x: 0, y: 0, z: 0, w: 1 },
      groundContact: { x: 0, y: 0, z: 0 },
      footprint: { minX: -1, minZ: -1, maxX: 1, maxZ: 1 },
      provenance: {
        license: "CC0-1.0",
        source: "https://example.com/assets/service",
      },
      connectionPorts: [
        {
          id: "input",
          position: { x: -1, y: 0, z: 0 },
          normal: { x: 1, z: 0 },
        },
      ],
    });

    expect(validateAssetDefinitionSemantics(assetDefinition)).toEqual([
      {
        code: "inward-connection-port-normal",
        severity: "error",
        entityId: "input",
        entityKind: "connection-port",
        message:
          'Connection Port "input" in Asset Definition "service" must point away from the Asset Footprint center.',
        path: ["connectionPorts", 0, "normal"],
      },
    ]);
  });
});
