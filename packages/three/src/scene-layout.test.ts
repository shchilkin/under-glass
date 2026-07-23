import { Group, ShadowMaterial, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import {
  parseVisualization,
  type AssetDefinition,
  type Node,
} from "@under-glass/core";

import {
  createGroundPlane,
  createPlacedAsset,
  derivePlacedFootprintGroundBounds,
} from "./scene-layout.js";

const definition: AssetDefinition = {
  schemaVersion: 1,
  assetId: "service",
  scale: 1,
  normalizationRotation: { x: 0, y: 0, z: 0, w: 1 },
  groundContact: { x: 0, y: 0, z: 0 },
  footprint: { minX: -1, minZ: -0.5, maxX: 1, maxZ: 0.5 },
  provenance: { license: "CC0-1.0", source: "test" },
};

const node: Node = {
  id: "api",
  label: "API",
  assetId: "service",
  position: { x: 4, z: 2 },
  quarterTurns: 1,
};

describe("scene layout", () => {
  it("preserves exact Node quarter turns in placement and footprint bounds", () => {
    const placement = createPlacedAsset(node, definition, new Group());
    placement.updateMatrixWorld(true);
    const transformed = new Vector3(1, 0, 0).applyMatrix4(placement.matrix);

    expect(transformed.x).toBeCloseTo(4, 6);
    expect(transformed.z).toBeCloseTo(1, 6);
    expect(derivePlacedFootprintGroundBounds(node, definition)).toEqual({
      minX: 3.5,
      minZ: 1,
      maxX: 4.5,
      maxZ: 3,
    });
  });

  it("uses an edge-free shadow receiver for the default scene", () => {
    const visualization = parseVisualization({
      schemaVersion: 1,
      nodes: [node],
      groups: [],
      connections: [],
      openingView: {
        cameraMode: "isometric",
        quarterTurns: 0,
        center: { x: 4, z: 2 },
        groundSpan: 8,
      },
    });
    const ground = createGroundPlane(
      visualization,
      new Map([[node.id, definition]]),
    );

    expect(ground.material).toBeInstanceOf(ShadowMaterial);
    expect(ground.receiveShadow).toBe(true);
  });
});
