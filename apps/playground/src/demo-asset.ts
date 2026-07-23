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

function decodeBase64(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

export async function resolveDemoAsset(
  assetId: string,
): Promise<ResolvedAsset> {
  if (assetId !== demoAssetDefinition.assetId) {
    throw new Error(`Unknown demo Asset ID "${assetId}".`);
  }

  return {
    bytes: decodeBase64(DEMO_GLB_BASE64),
    definition: demoAssetDefinition,
  };
}
