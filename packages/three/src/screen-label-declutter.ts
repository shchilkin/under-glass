import { Box3, Vector3, type Camera, type Object3D } from "three";

type WorldLabelRole = "connection" | "group" | "node";

interface ScreenLabelRectangle {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

interface ProjectedWorldLabel {
  readonly object: Object3D;
  readonly rectangle: ScreenLabelRectangle | null;
  readonly role: WorldLabelRole;
}

const ROLE_PRIORITY: Readonly<Record<WorldLabelRole, number>> = {
  node: 3,
  group: 2,
  connection: 1,
};

const ROLE_PADDING: Readonly<Record<WorldLabelRole, number>> = {
  node: 2,
  group: 4,
  connection: 2,
};
const COMPACT_VIEWPORT_WIDTH = 760;

function worldLabelRole(object: Object3D): WorldLabelRole | null {
  const role = object.userData.labelRole;
  return role === "connection" || role === "group" || role === "node"
    ? role
    : null;
}

function boxCorners(box: Box3): Vector3[] {
  return [
    new Vector3(box.min.x, box.min.y, box.min.z),
    new Vector3(box.min.x, box.min.y, box.max.z),
    new Vector3(box.min.x, box.max.y, box.min.z),
    new Vector3(box.min.x, box.max.y, box.max.z),
    new Vector3(box.max.x, box.min.y, box.min.z),
    new Vector3(box.max.x, box.min.y, box.max.z),
    new Vector3(box.max.x, box.max.y, box.min.z),
    new Vector3(box.max.x, box.max.y, box.max.z),
  ];
}

function projectLabelRectangle(
  object: Object3D,
  camera: Camera,
  width: number,
  height: number,
  padding: number,
): ScreenLabelRectangle | null {
  const box = new Box3().setFromObject(object);

  if (box.isEmpty()) {
    return null;
  }

  const projected = boxCorners(box).map((point) => point.project(camera));

  if (projected.every((point) => point.z < -1 || point.z > 1)) {
    return null;
  }

  const xCoordinates = projected.map((point) => (point.x * 0.5 + 0.5) * width);
  const yCoordinates = projected.map(
    (point) => (-point.y * 0.5 + 0.5) * height,
  );

  return {
    bottom: Math.max(...yCoordinates) + padding,
    left: Math.min(...xCoordinates) - padding,
    right: Math.max(...xCoordinates) + padding,
    top: Math.min(...yCoordinates) - padding,
  };
}

function rectanglesOverlap(
  first: ScreenLabelRectangle,
  second: ScreenLabelRectangle,
): boolean {
  return !(
    first.right < second.left ||
    first.left > second.right ||
    first.bottom < second.top ||
    first.top > second.bottom
  );
}

function compareProjectedLabels(
  first: ProjectedWorldLabel,
  second: ProjectedWorldLabel,
): number {
  const priorityDifference =
    ROLE_PRIORITY[second.role] - ROLE_PRIORITY[first.role];

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const firstText = String(first.object.userData.text ?? first.object.name);
  const secondText = String(second.object.userData.text ?? second.object.name);
  return firstText.localeCompare(secondText);
}

export function declutterWorldSpaceLabels(
  scene: Object3D,
  camera: Camera,
  width: number,
  height: number,
): number {
  const labels: Array<{ object: Object3D; role: WorldLabelRole }> = [];

  scene.traverse((object) => {
    const role = worldLabelRole(object);

    if (role !== null) {
      object.visible = true;
      object.userData.labelDecluttered = false;
      labels.push({ object, role });
    }
  });
  scene.updateMatrixWorld(true);

  const projected = labels
    .map(({ object, role }): ProjectedWorldLabel => ({
      object,
      rectangle: projectLabelRectangle(
        object,
        camera,
        width,
        height,
        ROLE_PADDING[role],
      ),
      role,
    }))
    .sort(compareProjectedLabels);
  const occupied: ScreenLabelRectangle[] = [];
  let hiddenCount = 0;

  for (const label of projected) {
    const labelRectangle = label.rectangle;
    const overlaps =
      labelRectangle === null ||
      occupied.some((rectangle) =>
        rectanglesOverlap(labelRectangle, rectangle),
      );
    const mayYield =
      label.role === "connection" || width < COMPACT_VIEWPORT_WIDTH;
    const hidden = overlaps && mayYield;

    label.object.visible = !hidden;
    label.object.userData.labelDecluttered = hidden;

    if (hidden) {
      hiddenCount += 1;
    } else if (labelRectangle !== null) {
      occupied.push(labelRectangle);
    }
  }

  return hiddenCount;
}
