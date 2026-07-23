import { OrthographicCamera, Vector3 } from "three";

import type { OpeningView } from "@under-glass/core";

export type CameraMode = OpeningView["cameraMode"];

const CAMERA_DISTANCE = 40;
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
}

export function createOpeningViewCamera(): OrthographicCamera {
  return new OrthographicCamera();
}
