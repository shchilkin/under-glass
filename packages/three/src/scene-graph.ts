import {
  BufferGeometry,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  Group as ThreeGroup,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
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
  groupDataBorder: 0x526e72,
  groupDataSurface: 0x162124,
  groupExternalBorder: 0x766852,
  groupExternalSurface: 0x242016,
  groupObservabilityBorder: 0x76574f,
  groupObservabilitySurface: 0x241a18,
  groupOperationsBorder: 0x665c76,
  groupOperationsSurface: 0x1e1a25,
  groupRuntimeBorder: 0x4c6b5e,
  groupRuntimeSurface: 0x16211d,
  groupBorder: 0x4c6b5e,
  groupSurface: 0x16211d,
  secondaryConnection: 0xc9816c,
  supportingConnection: 0x52675e,
};

interface GroupTreatment {
  readonly border: number;
  readonly label: string;
  readonly surface: number;
}

function groupTreatment(group: Group): GroupTreatment {
  if (group.styleKey === "runtime") {
    return {
      border: DEFAULT_SCENE_THEME.groupRuntimeBorder,
      label: "#b5d0c2",
      surface: DEFAULT_SCENE_THEME.groupRuntimeSurface,
    };
  }

  if (group.styleKey === "data") {
    return {
      border: DEFAULT_SCENE_THEME.groupDataBorder,
      label: "#b5c9cb",
      surface: DEFAULT_SCENE_THEME.groupDataSurface,
    };
  }

  if (group.styleKey === "external") {
    return {
      border: DEFAULT_SCENE_THEME.groupExternalBorder,
      label: "#d0c3a0",
      surface: DEFAULT_SCENE_THEME.groupExternalSurface,
    };
  }

  if (group.styleKey === "operations") {
    return {
      border: DEFAULT_SCENE_THEME.groupOperationsBorder,
      label: "#c6b9d5",
      surface: DEFAULT_SCENE_THEME.groupOperationsSurface,
    };
  }

  if (group.styleKey === "observability") {
    return {
      border: DEFAULT_SCENE_THEME.groupObservabilityBorder,
      label: "#d1aea3",
      surface: DEFAULT_SCENE_THEME.groupObservabilitySurface,
    };
  }

  return {
    border: DEFAULT_SCENE_THEME.groupBorder,
    label: "#b5d0c2",
    surface: DEFAULT_SCENE_THEME.groupSurface,
  };
}

const GROUP_LABEL_CANVAS_HEIGHT = 128;
const GROUP_LABEL_FONT_SIZE = 54;
const GROUP_LABEL_TRACKING = 7;
const GROUP_LABEL_WORLD_HEIGHT = 0.8;
const GROUP_LABEL_WORLD_MARGIN = 0.42;

function trackedTextWidth(
  context: CanvasRenderingContext2D,
  text: string,
): number {
  const glyphWidth = [...text].reduce(
    (width, glyph) => width + context.measureText(glyph).width,
    0,
  );
  return glyphWidth + Math.max(0, text.length - 1) * GROUP_LABEL_TRACKING;
}

function drawTrackedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
): void {
  let cursor = x;

  for (const glyph of text) {
    context.fillText(glyph, cursor, y);
    cursor += context.measureText(glyph).width + GROUP_LABEL_TRACKING;
  }
}

function createGroupLabelTexture(
  text: string,
  color: string,
): CanvasTexture | null {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (context === null) {
    return null;
  }

  context.font = `700 ${GROUP_LABEL_FONT_SIZE}px Inter, ui-sans-serif, system-ui, sans-serif`;
  const uppercaseText = text.toUpperCase();
  const horizontalPadding = 28;
  canvas.width = Math.ceil(
    trackedTextWidth(context, uppercaseText) + horizontalPadding * 2,
  );
  canvas.height = GROUP_LABEL_CANVAS_HEIGHT;

  context.font = `700 ${GROUP_LABEL_FONT_SIZE}px Inter, ui-sans-serif, system-ui, sans-serif`;
  context.fillStyle = color;
  context.textBaseline = "middle";
  drawTrackedText(
    context,
    uppercaseText,
    horizontalPadding,
    GROUP_LABEL_CANVAS_HEIGHT / 2,
  );

  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 4;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function addGroupLabel(
  root: ThreeGroup,
  group: Group,
  treatment: GroupTreatment,
): void {
  const text = group.label ?? group.id;
  const texture = createGroupLabelTexture(text, treatment.label);

  root.userData.groupLabel = {
    rendering: "world-space",
    text,
  };

  if (texture === null) {
    return;
  }

  const groupWidth = group.bounds.maxX - group.bounds.minX;
  const horizontalMargin = Math.min(
    GROUP_LABEL_WORLD_MARGIN,
    groupWidth * 0.15,
  );
  const availableWidth = groupWidth - horizontalMargin * 2;
  const textureAspect =
    (texture.image as HTMLCanvasElement).width /
    (texture.image as HTMLCanvasElement).height;
  const naturalWidth = GROUP_LABEL_WORLD_HEIGHT * textureAspect;
  const labelWidth = Math.min(availableWidth, naturalWidth);
  const labelHeight = labelWidth / textureAspect;
  const label = addMesh(
    root,
    new PlaneGeometry(labelWidth, labelHeight),
    new MeshBasicMaterial({
      depthWrite: false,
      map: texture,
      opacity: 0.9,
      toneMapped: false,
      transparent: true,
    }),
    [
      group.bounds.minX + horizontalMargin + labelWidth / 2,
      0.032,
      group.bounds.minZ + GROUP_LABEL_WORLD_MARGIN + labelHeight / 2,
    ],
  );
  label.name = "Group Label";
  label.rotation.x = -Math.PI / 2;
  label.userData.text = text;
}

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
  const treatment = groupTreatment(group);
  const width = group.bounds.maxX - group.bounds.minX;
  const depth = group.bounds.maxZ - group.bounds.minZ;
  const centerX = (group.bounds.minX + group.bounds.maxX) / 2;
  const centerZ = (group.bounds.minZ + group.bounds.maxZ) / 2;
  const surface = addMesh(
    root,
    new PlaneGeometry(width, depth),
    new MeshStandardMaterial({
      color: treatment.surface,
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
  addGroupLabel(root, group, treatment);

  const borderPoints = [
    new Vector3(group.bounds.minX, 0.018, group.bounds.minZ),
    new Vector3(group.bounds.maxX, 0.018, group.bounds.minZ),
    new Vector3(group.bounds.maxX, 0.018, group.bounds.maxZ),
    new Vector3(group.bounds.minX, 0.018, group.bounds.maxZ),
  ];
  const border = new LineLoop(
    new BufferGeometry().setFromPoints(borderPoints),
    new LineBasicMaterial({
      color: treatment.border,
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
