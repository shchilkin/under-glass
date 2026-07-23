import {
  type BufferGeometry,
  Material,
  Mesh,
  type Object3D,
  type Skeleton,
  SkinnedMesh,
  Texture,
} from "three";

interface DisposalRegistry {
  readonly geometries: Set<BufferGeometry>;
  readonly materials: Set<Material>;
  readonly skeletons: Set<Skeleton>;
  readonly textures: Set<Texture>;
}

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

function disposeSkeleton(
  object: Object3D,
  disposedSkeletons: Set<Skeleton>,
): void {
  if (
    object instanceof SkinnedMesh &&
    !disposedSkeletons.has(object.skeleton)
  ) {
    disposedSkeletons.add(object.skeleton);
    object.skeleton.dispose();
  }
}

function disposeGeometry(
  mesh: Mesh,
  disposedGeometries: Set<BufferGeometry>,
): void {
  if (!disposedGeometries.has(mesh.geometry)) {
    disposedGeometries.add(mesh.geometry);
    mesh.geometry.dispose();
  }
}

function disposeMaterials(mesh: Mesh, registry: DisposalRegistry): void {
  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];

  for (const material of materials) {
    if (registry.materials.has(material)) {
      continue;
    }

    registry.materials.add(material);
    disposeMaterialTextures(material, registry.textures);
    material.dispose();
  }
}

function disposeObjectResource(
  object: Object3D,
  registry: DisposalRegistry,
): void {
  disposeSkeleton(object, registry.skeletons);

  if (!(object instanceof Mesh)) {
    return;
  }

  disposeGeometry(object, registry.geometries);
  disposeMaterials(object, registry);
}

export function disposeObjectResources(root: Object3D): void {
  disposeObjectResourceRoots([root]);
}

export function disposeObjectResourceRoots(roots: Iterable<Object3D>): void {
  const registry: DisposalRegistry = {
    geometries: new Set(),
    materials: new Set(),
    skeletons: new Set(),
    textures: new Set(),
  };

  for (const root of roots) {
    root.traverse((object) => {
      disposeObjectResource(object, registry);
    });
  }
}
