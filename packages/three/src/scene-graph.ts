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
} from "three";

import type {
  BasicConnectionRoute,
  Group,
  OpeningView,
} from "@under-glass/core";

const COLORS = {
  connection: 0x83d6aa,
  gridMajor: 0xa4b8ae,
  gridMinor: 0x8aa096,
  groupBorder: 0x4c6b5e,
  groupSurface: 0x16211d,
  secondaryConnection: 0xe87a64,
};

function routeColor(route: BasicConnectionRoute): number {
  return route.styleKey === "telemetry"
    ? COLORS.secondaryConnection
    : COLORS.connection;
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

export function createInfiniteGrid(openingView: OpeningView): ThreeGroup {
  const root = new ThreeGroup();
  const span = Math.max(80, openingView.groundSpan * 8);
  const halfSpan = span / 2;

  const createLines = (
    step: number,
    color: number,
    opacity: number,
  ): LineSegments => {
    const points: Vector3[] = [];

    for (
      let coordinate = -halfSpan;
      coordinate <= halfSpan;
      coordinate += step
    ) {
      points.push(
        new Vector3(coordinate, 0.006, -halfSpan),
        new Vector3(coordinate, 0.006, halfSpan),
        new Vector3(-halfSpan, 0.006, coordinate),
        new Vector3(halfSpan, 0.006, coordinate),
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
    lines.position.set(openingView.center.x, 0, openingView.center.z);
    return lines;
  };

  root.name = "Infinite Ground Grid";
  root.add(createLines(1, COLORS.gridMinor, 0.15));
  root.add(createLines(4, COLORS.gridMajor, 0.26));
  return root;
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
      color: COLORS.groupSurface,
      depthWrite: false,
      metalness: 0,
      opacity: 0.72,
      roughness: 1,
      transparent: true,
    }),
    [centerX, 0.012, centerZ],
  );
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
      color: COLORS.groupBorder,
      opacity: 0.9,
      transparent: true,
    }),
  );

  root.name = `Group ${group.id}`;
  root.add(border);
  return root;
}

function createRouteArrow(
  parent: Object3D,
  point: Vector3,
  direction: Vector3,
  material: MeshStandardMaterial,
): void {
  const arrow = addMesh(parent, new ConeGeometry(0.14, 0.32, 16), material, [
    point.x,
    point.y,
    point.z,
  ]);
  arrow.quaternion.setFromUnitVectors(
    new Vector3(0, 1, 0),
    direction.normalize(),
  );
  arrow.position.addScaledVector(direction, -0.06);
}

export function createConnectionRoute(route: BasicConnectionRoute): ThreeGroup {
  const root = new ThreeGroup();
  const points = route.points.map(
    (point) => new Vector3(point.x, 0.16, point.z),
  );
  const color = routeColor(route);
  const material = new MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.28,
    metalness: 0.25,
    roughness: 0.4,
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
      new CylinderGeometry(0.052, 0.052, direction.length(), 10),
      material,
      [(start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2],
    );
    segment.quaternion.setFromUnitVectors(
      new Vector3(0, 1, 0),
      direction.clone().normalize(),
    );

    if (index < points.length - 1) {
      addMesh(root, new SphereGeometry(0.054, 10, 10), material, [
        end.x,
        end.y,
        end.z,
      ]);
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
    createRouteArrow(root, last, last.clone().sub(beforeLast), material);
  }

  if (
    route.direction === "bidirectional" &&
    first !== undefined &&
    second !== undefined
  ) {
    createRouteArrow(root, first, first.clone().sub(second), material);
  }

  root.name = `Connection ${route.connectionId}`;
  return root;
}
