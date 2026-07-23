import { Camera, Light, LoadingManager, type Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

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
  const manager = new LoadingManager();
  manager.setURLModifier(rejectExternalResource);
  const loader = new GLTFLoader(manager);
  const gltf = await loader.parseAsync(bytes, "");

  removeEmbeddedCamerasAndLights(gltf.scene);
  return gltf.scene;
}
