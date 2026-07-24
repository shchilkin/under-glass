import {
  Plane,
  Raycaster,
  Vector2,
  Vector3,
  type Object3D,
  type OrthographicCamera,
} from "three";

import type { GroundPoint } from "@under-glass/core";
import type { ScenePointer } from "./types.js";

export interface SceneViewport {
  readonly height: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

const GROUND_PLANE = new Plane(new Vector3(0, 1, 0), 0);

function pointerNdc(pointer: ScenePointer, viewport: SceneViewport): Vector2 {
  return new Vector2(
    ((pointer.clientX - viewport.left) / viewport.width) * 2 - 1,
    -((pointer.clientY - viewport.top) / viewport.height) * 2 + 1,
  );
}

function nodeIdForObject(object: Object3D | null): string | null {
  let current = object;

  while (current !== null) {
    if (typeof current.userData.nodeId === "string") {
      return current.userData.nodeId;
    }
    current = current.parent;
  }

  return null;
}

function raycasterAtPointer(
  camera: OrthographicCamera,
  pointer: ScenePointer,
  viewport: SceneViewport,
): Raycaster {
  const raycaster = new Raycaster();
  raycaster.setFromCamera(pointerNdc(pointer, viewport), camera);
  return raycaster;
}

export function hitTestNodeAtPointer(
  camera: OrthographicCamera,
  nodeObjects: readonly Object3D[],
  pointer: ScenePointer,
  viewport: SceneViewport,
): string | null {
  const intersections = raycasterAtPointer(
    camera,
    pointer,
    viewport,
  ).intersectObjects([...nodeObjects], true);

  for (const intersection of intersections) {
    const nodeId = nodeIdForObject(intersection.object);
    if (nodeId !== null) {
      return nodeId;
    }
  }

  return null;
}

export function projectPointerToGround(
  camera: OrthographicCamera,
  pointer: ScenePointer,
  viewport: SceneViewport,
): GroundPoint | null {
  const intersection = new Vector3();
  const hit = raycasterAtPointer(camera, pointer, viewport).ray.intersectPlane(
    GROUND_PLANE,
    intersection,
  );

  return hit === null ? null : { x: hit.x, z: hit.z };
}
