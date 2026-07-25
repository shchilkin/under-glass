import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from "three";
import { describe, expect, it } from "vitest";

import {
  hitTestNodeAtPointer,
  projectPointerToGround,
} from "./scene-interaction.js";
import { applyOpeningView, createOpeningViewCamera } from "./scene-camera.js";

const VIEWPORT = {
  height: 600,
  left: 100,
  top: 50,
  width: 800,
};
const CENTER_POINTER = {
  clientX: VIEWPORT.left + VIEWPORT.width / 2,
  clientY: VIEWPORT.top + VIEWPORT.height / 2,
};

describe("scene interaction projection", () => {
  it.each(["isometric", "top"] as const)(
    "projects the center pointer onto the Ground Plane in %s mode",
    (cameraMode) => {
      const camera = createOpeningViewCamera();
      applyOpeningView(
        camera,
        {
          cameraMode,
          quarterTurns: 0,
          center: { x: 0, z: 0 },
          groundSpan: 12,
        },
        cameraMode,
        VIEWPORT.width,
        VIEWPORT.height,
      );

      const point = projectPointerToGround(camera, CENTER_POINTER, VIEWPORT);

      expect(point?.x).toBeCloseTo(0, 8);
      expect(point?.z).toBeCloseTo(0, 8);
    },
  );

  it("resolves the stable Node ID from a descendant mesh hit", () => {
    const camera = createOpeningViewCamera();
    applyOpeningView(
      camera,
      {
        cameraMode: "isometric",
        quarterTurns: 0,
        center: { x: 0, z: 0 },
        groundSpan: 12,
      },
      "isometric",
      VIEWPORT.width,
      VIEWPORT.height,
    );
    const node = new Group();
    node.userData.nodeId = "web";
    const mesh = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
    mesh.position.y = 1;
    node.add(mesh);
    node.updateMatrixWorld(true);

    expect(hitTestNodeAtPointer(camera, [node], CENTER_POINTER, VIEWPORT)).toBe(
      "web",
    );
  });
});
