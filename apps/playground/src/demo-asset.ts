import { parseAssetDefinition, type AssetDefinition } from "@under-glass/core";
import type { ResolvedAsset } from "@under-glass/three";

const DEMO_GLB_BASE64 =
  "Z2xURgIAAAAEBgAAYAMAAEpTT057ImFzc2V0Ijp7InZlcnNpb24iOiIyLjAiLCJnZW5lcmF0b3IiOiJVbmRlciBHbGFzcyB0ZXN0IGZpeHR1cmUifSwic2NlbmUiOjAsInNjZW5lcyI6W3sibm9kZXMiOlswXX1dLCJub2RlcyI6W3sibWVzaCI6MH1dLCJtZXNoZXMiOlt7InByaW1pdGl2ZXMiOlt7ImF0dHJpYnV0ZXMiOnsiUE9TSVRJT04iOjAsIk5PUk1BTCI6MX0sImluZGljZXMiOjIsIm1hdGVyaWFsIjowfV19XSwibWF0ZXJpYWxzIjpbeyJuYW1lIjoiVW5kZXIgR2xhc3MgY3lhbiBQQlIiLCJwYnJNZXRhbGxpY1JvdWdobmVzcyI6eyJiYXNlQ29sb3JGYWN0b3IiOlswLjA4LDAuNTgsMC43MiwxXSwibWV0YWxsaWNGYWN0b3IiOjAuMTUsInJvdWdobmVzc0ZhY3RvciI6MC41NX19XSwiYWNjZXNzb3JzIjpbeyJidWZmZXJWaWV3IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6MjQsInR5cGUiOiJWRUMzIiwibWluIjpbLTAuNSwtMC41LC0xXSwibWF4IjpbMC41LDAuNSwxXX0seyJidWZmZXJWaWV3IjoxLCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6MjQsInR5cGUiOiJWRUMzIn0seyJidWZmZXJWaWV3IjoyLCJjb21wb25lbnRUeXBlIjo1MTIzLCJjb3VudCI6MzYsInR5cGUiOiJTQ0FMQVIiLCJtaW4iOlswXSwibWF4IjpbMjNdfV0sImJ1ZmZlclZpZXdzIjpbeyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjAsImJ5dGVMZW5ndGgiOjI4OCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjI4OCwiYnl0ZUxlbmd0aCI6Mjg4LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6NTc2LCJieXRlTGVuZ3RoIjo3MiwidGFyZ2V0IjozNDk2M31dLCJidWZmZXJzIjpbeyJieXRlTGVuZ3RoIjo2NDh9XX2IAgAAQklOAAAAAD8AAAC/AACAvwAAAD8AAAA/AACAvwAAAD8AAAA/AACAPwAAAD8AAAC/AACAPwAAAL8AAAC/AACAPwAAAL8AAAA/AACAPwAAAL8AAAA/AACAvwAAAL8AAAC/AACAvwAAAL8AAAA/AACAvwAAAL8AAAA/AACAPwAAAD8AAAA/AACAPwAAAD8AAAA/AACAvwAAAL8AAAC/AACAPwAAAL8AAAC/AACAvwAAAD8AAAC/AACAvwAAAD8AAAC/AACAPwAAAL8AAAC/AACAPwAAAD8AAAC/AACAPwAAAD8AAAA/AACAPwAAAL8AAAA/AACAPwAAAD8AAAC/AACAvwAAAL8AAAC/AACAvwAAAL8AAAA/AACAvwAAAD8AAAA/AACAvwAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAQACAAAAAgADAAQABQAGAAQABgAHAAgACQAKAAgACgALAAwADQAOAAwADgAPABAAEQASABAAEgATABQAFQAWABQAFgAXAA==";

const demoAssetDefinition: AssetDefinition = parseAssetDefinition({
  schemaVersion: 1,
  assetId: "demo-system",
  scale: 1.4,
  normalizationRotation: { x: 0, y: 0, z: 0, w: 1 },
  groundContact: { x: 0, y: -0.5, z: 0 },
  footprint: { minX: -0.7, minZ: -1.4, maxX: 0.7, maxZ: 1.4 },
  provenance: {
    license: "CC0-1.0",
    source: "Generated in the Under Glass repository",
  },
});

interface DemoGlbNode {
  readonly mesh: 0;
  readonly scale: readonly [number, number, number];
  readonly translation: readonly [number, number, number];
}

interface DemoAssetVariant {
  readonly color: readonly [number, number, number, number];
  readonly definition: AssetDefinition;
  readonly nodes: readonly DemoGlbNode[];
}

function variantDefinition(
  assetId: string,
  footprint: AssetDefinition["footprint"],
): AssetDefinition {
  return parseAssetDefinition({
    schemaVersion: 1,
    assetId,
    scale: 1,
    normalizationRotation: { x: 0, y: 0, z: 0, w: 1 },
    groundContact: { x: 0, y: 0, z: 0 },
    footprint,
    provenance: {
      license: "CC0-1.0",
      source: "Generated in the Under Glass repository",
    },
  });
}

const DEMO_ASSET_VARIANTS: Readonly<Record<string, DemoAssetVariant>> = {
  "browser-asset": {
    color: [0.08, 0.12, 0.11, 1],
    definition: variantDefinition("browser-asset", {
      minX: -0.8,
      minZ: -0.55,
      maxX: 0.8,
      maxZ: 0.55,
    }),
    nodes: [
      { mesh: 0, scale: [1.3, 0.8, 0.1], translation: [0, 0.55, -0.1] },
      { mesh: 0, scale: [0.16, 0.55, 0.12], translation: [0, 0.28, 0.1] },
      { mesh: 0, scale: [0.7, 0.1, 0.4], translation: [0, 0.05, 0.16] },
    ],
  },
  "database-asset": {
    color: [0.07, 0.13, 0.1, 1],
    definition: variantDefinition("database-asset", {
      minX: -0.7,
      minZ: -0.7,
      maxX: 0.7,
      maxZ: 0.7,
    }),
    nodes: [
      { mesh: 0, scale: [1.1, 0.2, 0.55], translation: [0, 0.16, 0] },
      { mesh: 0, scale: [1.1, 0.2, 0.55], translation: [0, 0.44, 0] },
      { mesh: 0, scale: [1.1, 0.2, 0.55], translation: [0, 0.72, 0] },
    ],
  },
  "queue-asset": {
    color: [0.07, 0.16, 0.12, 1],
    definition: variantDefinition("queue-asset", {
      minX: -0.9,
      minZ: -0.55,
      maxX: 0.9,
      maxZ: 0.55,
    }),
    nodes: [-0.6, -0.2, 0.2, 0.6].map((x) => ({
      mesh: 0,
      scale: [0.22, 0.62, 0.34],
      translation: [x, 0.31, 0],
    })),
  },
  "service-asset": {
    color: [0.06, 0.11, 0.09, 1],
    definition: variantDefinition("service-asset", {
      minX: -0.65,
      minZ: -0.6,
      maxX: 0.65,
      maxZ: 0.6,
    }),
    nodes: [
      { mesh: 0, scale: [1, 0.22, 0.48], translation: [0, 0.15, 0] },
      { mesh: 0, scale: [1, 0.22, 0.48], translation: [0, 0.43, 0] },
      { mesh: 0, scale: [1, 0.22, 0.48], translation: [0, 0.71, 0] },
    ],
  },
};

function decodeBase64(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function rewriteDemoGlb(
  bytes: ArrayBuffer,
  rewrite: (gltf: Record<string, unknown>) => void,
): ArrayBuffer {
  const source = new Uint8Array(bytes);
  const sourceView = new DataView(bytes);
  const jsonLength = sourceView.getUint32(12, true);
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonLength;
  const jsonText = new TextDecoder()
    .decode(source.subarray(jsonStart, jsonEnd))
    .trimEnd();
  const gltf = JSON.parse(jsonText) as Record<string, unknown>;
  rewrite(gltf);

  const encodedJson = new TextEncoder().encode(JSON.stringify(gltf));
  const paddedJsonLength = Math.ceil(encodedJson.length / 4) * 4;
  const trailingChunks = source.subarray(jsonEnd);
  const output = new Uint8Array(
    20 + paddedJsonLength + trailingChunks.byteLength,
  );
  const outputView = new DataView(output.buffer);

  output.set(source.subarray(0, 12), 0);
  outputView.setUint32(8, output.byteLength, true);
  outputView.setUint32(12, paddedJsonLength, true);
  outputView.setUint32(16, 0x4e4f534a, true);
  output.fill(0x20, jsonStart, jsonStart + paddedJsonLength);
  output.set(encodedJson, jsonStart);
  output.set(trailingChunks, jsonStart + paddedJsonLength);
  return output.buffer;
}

export function markDemoGlbAsCompressed(bytes: ArrayBuffer): ArrayBuffer {
  return rewriteDemoGlb(bytes, (gltf) => {
    const compressionExtension = "KHR_draco_mesh_compression";

    gltf.extensionsUsed = [compressionExtension];
    gltf.extensionsRequired = [compressionExtension];
  });
}

function createVariantGlb(variant: DemoAssetVariant): ArrayBuffer {
  return rewriteDemoGlb(decodeBase64(DEMO_GLB_BASE64), (gltf) => {
    gltf.nodes = variant.nodes;
    gltf.scenes = [{ nodes: variant.nodes.map((_node, index) => index) }];

    const materials = gltf.materials;

    if (Array.isArray(materials)) {
      const firstMaterial = materials[0];

      if (typeof firstMaterial === "object" && firstMaterial !== null) {
        const pbr = (firstMaterial as Record<string, unknown>)
          .pbrMetallicRoughness;

        if (typeof pbr === "object" && pbr !== null) {
          (pbr as Record<string, unknown>).baseColorFactor = variant.color;
        }
      }
    }
  });
}

export async function resolveDemoAsset(
  assetId: string,
): Promise<ResolvedAsset> {
  if (assetId === demoAssetDefinition.assetId) {
    return {
      bytes: decodeBase64(DEMO_GLB_BASE64),
      definition: demoAssetDefinition,
    };
  }

  const variant = DEMO_ASSET_VARIANTS[assetId];

  if (variant === undefined) {
    throw new Error(`Unknown demo Asset ID "${assetId}".`);
  }

  return {
    bytes: createVariantGlb(variant),
    definition: variant.definition,
  };
}
