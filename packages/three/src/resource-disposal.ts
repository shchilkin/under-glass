import {
  type BufferGeometry,
  Material,
  Mesh,
  type Object3D,
  Texture,
} from "three";

function disposeMaterialTextures(
  material: Material,
  disposedTextures: Set<Texture>,
): void {
  for (const value of Object.values(material)) {
    if (value instanceof Texture && !disposedTextures.has(value)) {
      disposedTextures.add(value);
      value.dispose();
    }
  }
}

export function disposeObjectResources(root: Object3D): void {
  const disposedGeometries = new Set<BufferGeometry>();
  const disposedMaterials = new Set<Material>();
  const disposedTextures = new Set<Texture>();

  root.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }

    const geometry = object.geometry;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    if (geometry !== undefined && !disposedGeometries.has(geometry)) {
      disposedGeometries.add(geometry);
      geometry.dispose();
    }

    for (const material of materials) {
      if (!(material instanceof Material) || disposedMaterials.has(material)) {
        continue;
      }

      disposedMaterials.add(material);
      disposeMaterialTextures(material, disposedTextures);
      material.dispose();
    }
  });
}
