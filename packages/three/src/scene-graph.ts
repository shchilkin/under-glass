import {
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group as ThreeGroup,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  Vector3,
  type Material,
  type Object3D,
  type OrthographicCamera,
} from "three";

import type { BasicConnectionRoute, Group } from "@under-glass/core";

import { disposeObjectResources } from "./resource-disposal.js";
import { deriveViewportGroundBounds } from "./scene-camera.js";

export const DEFAULT_SCENE_THEME = {
  connection: 0x83d6aa,
  gridMajor: 0xa4b8ae,
  gridMinor: 0x8aa096,
  groupBorder: 0x4c6b5e,
  groupSurface: 0x16211d,
  secondaryConnection: 0xc9816c,
  supportingConnection: 0x52675e,
};

interface RouteTreatment {
  readonly arrowHeight: number;
  readonly arrowRadius: number;
  readonly color: number;
  readonly emissiveIntensity: number;
  readonly metalness: number;
  readonly radius: number;
  readonly roughness: number;
}

function routeTreatment(route: BasicConnectionRoute): RouteTreatment {
  if (route.styleKey === "supporting") {
    return {
      arrowHeight: 0.24,
      arrowRadius: 0.095,
      color: DEFAULT_SCENE_THEME.supportingConnection,
      emissiveIntensity: 0.04,
      metalness: 0.1,
      radius: 0.03,
      roughness: 0.65,
    };
  }

  if (route.styleKey === "telemetry") {
    return {
      arrowHeight: 0.26,
      arrowRadius: 0.105,
      color: DEFAULT_SCENE_THEME.secondaryConnection,
      emissiveIntensity: 0.08,
      metalness: 0.1,
      radius: 0.034,
      roughness: 0.65,
    };
  }

  return {
    arrowHeight: 0.32,
    arrowRadius: 0.14,
    color: DEFAULT_SCENE_THEME.connection,
    emissiveIntensity: 0.28,
    metalness: 0.25,
    radius: 0.052,
    roughness: 0.4,
  };
}

function addMesh(
  parent: Object3D,
  geometry: ConeGeometry | CylinderGeometry | PlaneGeometry | SphereGeometry,
  material: Material,
  position: readonly [number, number, number],
): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

export function createInfiniteGrid(): ThreeGroup {
  const root = new ThreeGroup();
  root.name = "Infinite Ground Grid";
  return root;
}

export function updateInfiniteGrid(
  root: ThreeGroup,
  camera: OrthographicCamera,
): void {
  for (const child of [...root.children]) {
    root.remove(child);
    disposeObjectResources(child);
  }

  const bounds = deriveViewportGroundBounds(camera);
  const createLines = (
    step: number,
    color: number,
    opacity: number,
  ): LineSegments => {
    const points: Vector3[] = [];
    const firstX = Math.floor(bounds.minX / step) * step;
    const firstZ = Math.floor(bounds.minZ / step) * step;

    for (let x = firstX; x <= bounds.maxX; x += step) {
      points.push(
        new Vector3(x, 0.006, bounds.minZ),
        new Vector3(x, 0.006, bounds.maxZ),
      );
    }

    for (let z = firstZ; z <= bounds.maxZ; z += step) {
      points.push(
        new Vector3(bounds.minX, 0.006, z),
        new Vector3(bounds.maxX, 0.006, z),
      );
    }

    const lines = new LineSegments(
      new BufferGeometry().setFromPoints(points),
      new LineBasicMaterial({
        color,
        depthWrite: false,
        opacity,
        transparent: true,
      }),
    );
    return lines;
  };

  root.userData.viewportGroundBounds = bounds;
  root.add(createLines(1, DEFAULT_SCENE_THEME.gridMinor, 0.055));
  root.add(createLines(4, DEFAULT_SCENE_THEME.gridMajor, 0.13));
}

export function createGroupSurface(group: Group): ThreeGroup {
  const root = new ThreeGroup();
  const width = group.bounds.maxX - group.bounds.minX;
  const depth = group.bounds.maxZ - group.bounds.minZ;
  const centerX = (group.bounds.minX + group.bounds.maxX) / 2;
  const centerZ = (group.bounds.minZ + group.bounds.maxZ) / 2;
  const surface = addMesh(
    root,
    new PlaneGeometry(width, depth),
    new MeshStandardMaterial({
      color: DEFAULT_SCENE_THEME.groupSurface,
      depthWrite: false,
      metalness: 0,
      opacity: 0.46,
      roughness: 1,
      transparent: true,
    }),
    [centerX, 0.012, centerZ],
  );
  surface.name = "Group Surface";
  surface.rotation.x = -Math.PI / 2;
  surface.receiveShadow = true;

  const borderPoints = [
    new Vector3(group.bounds.minX, 0.018, group.bounds.minZ),
    new Vector3(group.bounds.maxX, 0.018, group.bounds.minZ),
    new Vector3(group.bounds.maxX, 0.018, group.bounds.maxZ),
    new Vector3(group.bounds.minX, 0.018, group.bounds.maxZ),
  ];
  const border = new LineLoop(
    new BufferGeometry().setFromPoints(borderPoints),
    new LineBasicMaterial({
      color: DEFAULT_SCENE_THEME.groupBorder,
      opacity: 0.56,
      transparent: true,
    }),
  );
  border.name = "Group Border";

  root.name = `Group ${group.id}`;
  root.add(border);
  return root;
}

function createRouteArrow(
  parent: Object3D,
  point: Vector3,
  direction: Vector3,
  material: MeshStandardMaterial,
  name: string,
  radius: number,
  height: number,
): void {
  const arrow = addMesh(
    parent,
    new ConeGeometry(radius, height, 16),
    material,
    [point.x, point.y, point.z],
  );
  arrow.name = name;
  arrow.quaternion.setFromUnitVectors(
    new Vector3(0, 1, 0),
    direction.normalize(),
  );
  arrow.position.addScaledVector(direction, -height * 0.1875);
}

export function createConnectionRoute(route: BasicConnectionRoute): ThreeGroup {
  const root = new ThreeGroup();
  const points = route.points.map(
    (point) => new Vector3(point.x, 0.16, point.z),
  );
  const treatment = routeTreatment(route);
  const material = new MeshStandardMaterial({
    color: treatment.color,
    emissive: treatment.color,
    emissiveIntensity: treatment.emissiveIntensity,
    metalness: treatment.metalness,
    roughness: treatment.roughness,
  });

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];

    if (start === undefined || end === undefined) {
      continue;
    }

    const direction = end.clone().sub(start);
    const segment = addMesh(
      root,
      new CylinderGeometry(
        treatment.radius,
        treatment.radius,
        direction.length(),
        10,
      ),
      material,
      [(start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2],
    );
    segment.name = "Route Segment";
    segment.quaternion.setFromUnitVectors(
      new Vector3(0, 1, 0),
      direction.clone().normalize(),
    );

    if (index < points.length - 1) {
      addMesh(
        root,
        new SphereGeometry(treatment.radius * 1.04, 10, 10),
        material,
        [end.x, end.y, end.z],
      );
    }
  }

  const first = points[0];
  const second = points[1];
  const last = points.at(-1);
  const beforeLast = points.at(-2);

  if (
    (route.direction === "oneWay" || route.direction === "bidirectional") &&
    last !== undefined &&
    beforeLast !== undefined
  ) {
    createRouteArrow(
      root,
      last,
      last.clone().sub(beforeLast),
      material,
      "Forward Arrow",
      treatment.arrowRadius,
      treatment.arrowHeight,
    );
  }

  if (
    route.direction === "bidirectional" &&
    first !== undefined &&
    second !== undefined
  ) {
    createRouteArrow(
      root,
      first,
      first.clone().sub(second),
      material,
      "Backward Arrow",
      treatment.arrowRadius,
      treatment.arrowHeight,
    );
  }

  root.name = `Connection ${route.connectionId}`;
  return root;
}
