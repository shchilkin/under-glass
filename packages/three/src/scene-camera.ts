import { OrthographicCamera, Vector3 } from "three";

import type { GroundBounds, OpeningView } from "@under-glass/core";

export type CameraMode = OpeningView["cameraMode"];

const CAMERA_DISTANCE = 40;
const GRID_VIEWPORT_PADDING = 2;
const Y_AXIS = new Vector3(0, 1, 0);

export function applyOpeningView(
  camera: OrthographicCamera,
  openingView: OpeningView,
  cameraMode: CameraMode,
  width: number,
  height: number,
): void {
  const aspect = Math.max(1, width) / Math.max(1, height);
  const halfGroundSpan = openingView.groundSpan / 2;
  const center = new Vector3(openingView.center.x, 0, openingView.center.z);
  const quarterTurnAngle = openingView.quarterTurns * (Math.PI / 2);

  camera.left = -halfGroundSpan * aspect;
  camera.right = halfGroundSpan * aspect;
  camera.top = halfGroundSpan;
  camera.bottom = -halfGroundSpan;
  camera.near = 0.1;
  camera.far = 100;

  if (cameraMode === "isometric") {
    const direction = new Vector3(1, 1, 1)
      .normalize()
      .applyAxisAngle(Y_AXIS, quarterTurnAngle);
    camera.up.set(0, 1, 0);
    camera.position.copy(center).addScaledVector(direction, CAMERA_DISTANCE);
  } else {
    camera.position.copy(center).add(new Vector3(0, CAMERA_DISTANCE, 0));
    camera.up
      .set(0, 0, -1)
      .applyAxisAngle(Y_AXIS, quarterTurnAngle)
      .normalize();
  }

  camera.lookAt(center);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

export function createOpeningViewCamera(): OrthographicCamera {
  return new OrthographicCamera();
}

export function deriveViewportGroundBounds(
  camera: OrthographicCamera,
): GroundBounds {
  const intersections = (
    [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ] as const
  ).map(([x, y]) => {
    const near = new Vector3(x, y, -1).unproject(camera);
    const far = new Vector3(x, y, 1).unproject(camera);
    const direction = far.sub(near);

    return near.addScaledVector(direction, -near.y / direction.y);
  });

  return {
    minX:
      Math.floor(Math.min(...intersections.map((point) => point.x))) -
      GRID_VIEWPORT_PADDING,
    minZ:
      Math.floor(Math.min(...intersections.map((point) => point.z))) -
      GRID_VIEWPORT_PADDING,
    maxX:
      Math.ceil(Math.max(...intersections.map((point) => point.x))) +
      GRID_VIEWPORT_PADDING,
    maxZ:
      Math.ceil(Math.max(...intersections.map((point) => point.z))) +
      GRID_VIEWPORT_PADDING,
  };
}
