import { Group } from "three";
import { describe, expect, it, vi } from "vitest";

import type { AssetDefinition, Node } from "@under-glass/core";

import { createAssetSession } from "./asset-session.js";

const definition: AssetDefinition = {
  schemaVersion: 1,
  assetId: "shared-asset",
  scale: 1,
  normalizationRotation: { x: 0, y: 0, z: 0, w: 1 },
  groundContact: { x: 0, y: 0, z: 0 },
  footprint: { minX: -0.5, minZ: -0.5, maxX: 0.5, maxZ: 0.5 },
  provenance: { license: "CC0-1.0", source: "test" },
};

function node(id: string): Node {
  return {
    id,
    label: id,
    assetId: definition.assetId,
    position: { x: 0, z: 0 },
    quarterTurns: 0,
  };
}

describe("Asset Session", () => {
  it("resolves and parses one Asset ID once while instantiating every Node", async () => {
    const resolveAsset = vi.fn(async () => ({
      bytes: new ArrayBuffer(0),
      definition,
    }));
    const parseAsset = vi.fn(async () => new Group());
    const session = createAssetSession({
      isDisposed: () => false,
      parseAsset,
      resolveAsset,
    });

    const [first, second] = await Promise.all([
      session.load(node("first")).instantiate(),
      session.load(node("second")).instantiate(),
    ]);

    expect(resolveAsset).toHaveBeenCalledTimes(1);
    expect(parseAsset).toHaveBeenCalledTimes(1);
    expect(first?.asset).not.toBe(second?.asset);
    expect(session.getMetrics()).toEqual({
      cachedAssetCount: 1,
      nodeInstanceCount: 2,
      parsedAssetCount: 1,
    });
  });

  it("does not count a failed parse as a parsed or cached Asset", async () => {
    const session = createAssetSession({
      isDisposed: () => false,
      parseAsset: async () => {
        throw new Error("Malformed GLB");
      },
      resolveAsset: async () => ({
        bytes: new ArrayBuffer(0),
        definition,
      }),
    });

    await expect(session.load(node("malformed")).instantiate()).rejects.toThrow(
      "Malformed GLB",
    );
    expect(session.getMetrics()).toEqual({
      cachedAssetCount: 0,
      nodeInstanceCount: 0,
      parsedAssetCount: 0,
    });
  });
});
