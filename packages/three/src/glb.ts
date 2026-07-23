import { Camera, Light, LoadingManager, type Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK_TYPE = 0x4e4f534a;
const UNSUPPORTED_COMPRESSION_EXTENSIONS = new Set([
  "EXT_meshopt_compression",
  "KHR_draco_mesh_compression",
  "KHR_texture_basisu",
]);

interface GlbJson {
  readonly extensionsRequired?: readonly string[];
  readonly extensionsUsed?: readonly string[];
}

function hasGlbJsonHeader(bytes: ArrayBuffer): boolean {
  if (bytes.byteLength < 20) {
    return false;
  }

  const view = new DataView(bytes);
  return (
    view.getUint32(0, true) === GLB_MAGIC &&
    view.getUint32(16, true) === JSON_CHUNK_TYPE
  );
}

function glbJsonChunkLength(bytes: ArrayBuffer): number | null {
  if (!hasGlbJsonHeader(bytes)) {
    return null;
  }

  const jsonLength = new DataView(bytes).getUint32(12, true);

  if (20 + jsonLength > bytes.byteLength) {
    return null;
  }

  return jsonLength;
}

function parseGlbJson(bytes: ArrayBuffer, jsonLength: number): GlbJson | null {
  const json = new TextDecoder()
    .decode(new Uint8Array(bytes, 20, jsonLength))
    .trimEnd();

  try {
    return JSON.parse(json) as GlbJson;
  } catch {
    return null;
  }
}

function extensionsOrEmpty(
  extensions: readonly string[] | undefined,
): readonly string[] {
  return extensions ?? [];
}

function collectGlbExtensions(glbJson: GlbJson): Set<string> {
  return new Set([
    ...extensionsOrEmpty(glbJson.extensionsUsed),
    ...extensionsOrEmpty(glbJson.extensionsRequired),
  ]);
}

function readGlbExtensions(bytes: ArrayBuffer): Set<string> {
  const jsonLength = glbJsonChunkLength(bytes);

  if (jsonLength === null) {
    return new Set();
  }

  const glbJson = parseGlbJson(bytes, jsonLength);

  if (glbJson === null) {
    return new Set();
  }

  return collectGlbExtensions(glbJson);
}

function firstUnsupportedCompression(
  extensions: Iterable<string>,
): string | null {
  for (const extension of extensions) {
    if (UNSUPPORTED_COMPRESSION_EXTENSIONS.has(extension)) {
      return extension;
    }
  }

  return null;
}

function rejectUnsupportedCompression(bytes: ArrayBuffer): void {
  const unsupportedExtension = firstUnsupportedCompression(
    readGlbExtensions(bytes),
  );

  if (unsupportedExtension !== null) {
    throw new Error(
      `GLB uses unsupported compression extension "${unsupportedExtension}".`,
    );
  }
}

function rejectExternalResource(resourceUrl: string): string {
  if (resourceUrl.startsWith("blob:") || resourceUrl.startsWith("data:")) {
    return resourceUrl;
  }

  throw new Error(
    `GLB references external resource "${resourceUrl}"; only self-contained assets are supported.`,
  );
}

function removeEmbeddedCamerasAndLights(root: Object3D): void {
  const ignoredObjects: Object3D[] = [];

  root.traverse((object) => {
    if (object instanceof Camera || object instanceof Light) {
      ignoredObjects.push(object);
    }
  });

  for (const object of ignoredObjects) {
    object.removeFromParent();
  }
}

export async function parseGlb(bytes: ArrayBuffer): Promise<Object3D> {
  rejectUnsupportedCompression(bytes);
  const manager = new LoadingManager();
  manager.setURLModifier(rejectExternalResource);
  const loader = new GLTFLoader(manager);
  const gltf = await loader.parseAsync(bytes, "");

  removeEmbeddedCamerasAndLights(gltf.scene);
  return gltf.scene;
}
