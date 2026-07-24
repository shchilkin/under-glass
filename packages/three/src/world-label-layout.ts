import type { Object3D } from "three";

interface WorldLabelBounds {
  readonly depth: number;
  readonly width: number;
}

interface WorldLabelRectangle {
  readonly maxX: number;
  readonly maxZ: number;
  readonly minX: number;
  readonly minZ: number;
}

interface WorldSpaceLabels {
  readonly connectionLabels: Object3D[];
  readonly occupied: WorldLabelRectangle[];
}

const LABEL_MARGIN = 0.08;
const COLLISION_STEP = 0.46;
const MAX_PLACEMENT_ATTEMPTS = 12;

function worldLabelBounds(object: Object3D): WorldLabelBounds | null {
  const bounds = object.userData.labelBounds as WorldLabelBounds | undefined;
  return bounds ?? null;
}

function worldLabelRectangle(object: Object3D): WorldLabelRectangle | null {
  const bounds = worldLabelBounds(object);

  if (bounds === null) {
    return null;
  }

  return {
    maxX: object.position.x + bounds.width / 2 + LABEL_MARGIN,
    maxZ: object.position.z + bounds.depth / 2 + LABEL_MARGIN,
    minX: object.position.x - bounds.width / 2 - LABEL_MARGIN,
    minZ: object.position.z - bounds.depth / 2 - LABEL_MARGIN,
  };
}

function rectanglesOverlap(
  first: WorldLabelRectangle,
  second: WorldLabelRectangle,
): boolean {
  return !(
    first.maxX < second.minX ||
    first.minX > second.maxX ||
    first.maxZ < second.minZ ||
    first.minZ > second.maxZ
  );
}

function collectWorldSpaceLabels(scene: Object3D): WorldSpaceLabels {
  const connectionLabels: Object3D[] = [];
  const occupied: WorldLabelRectangle[] = [];

  scene.traverse((object) => {
    const role = object.userData.labelRole;

    if (role === "connection") {
      connectionLabels.push(object);
      return;
    }

    if (role === "group") {
      const rectangle = worldLabelRectangle(object);

      if (rectangle !== null) {
        occupied.push(rectangle);
      }
    }
  });

  return { connectionLabels, occupied };
}

function movePerpendicularToRoute(
  label: Object3D,
  bounds: WorldLabelBounds,
  originX: number,
  originZ: number,
  attempt: number,
): void {
  const step = Math.ceil((attempt + 1) / 2) * COLLISION_STEP;
  const direction = attempt % 2 === 0 ? 1 : -1;

  if (bounds.depth > bounds.width) {
    label.position.x = originX + step * direction;
  } else {
    label.position.z = originZ + step * direction;
  }
}

function placeConnectionLabel(
  label: Object3D,
  occupied: WorldLabelRectangle[],
): void {
  const bounds = worldLabelBounds(label);

  if (bounds === null) {
    return;
  }

  const originX = label.position.x;
  const originZ = label.position.z;

  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt += 1) {
    const rectangle = worldLabelRectangle(label);
    const hasCollision =
      rectangle !== null &&
      occupied.some((candidate) => rectanglesOverlap(rectangle, candidate));

    if (!hasCollision) {
      if (rectangle !== null) {
        occupied.push(rectangle);
      }
      return;
    }

    movePerpendicularToRoute(label, bounds, originX, originZ, attempt);
  }
}

export function separateWorldSpaceConnectionLabels(scene: Object3D): void {
  const { connectionLabels, occupied } = collectWorldSpaceLabels(scene);

  for (const label of connectionLabels) {
    placeConnectionLabel(label, occupied);
  }
}
