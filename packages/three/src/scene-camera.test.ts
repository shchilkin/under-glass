import { Vector3 } from "three";
import { describe, expect, it } from "vitest";

import type { OpeningView } from "@under-glass/core";

import {
  applyOpeningView,
  applyOpeningViewTransition,
  createOpeningViewCamera,
  deriveOpeningViewCameraPoses,
  deriveViewportGroundBounds,
} from "./scene-camera.js";

const openingView: OpeningView = {
  cameraMode: "isometric",
  quarterTurns: 0,
  center: { x: 3, z: -2 },
  groundSpan: 12,
};

describe("Opening View camera", () => {
  it("uses the specified isometric angle while preserving center and span", () => {
    const camera = createOpeningViewCamera();

    applyOpeningView(camera, openingView, "isometric", 1200, 600);

    const direction = camera.position
      .clone()
      .sub(new Vector3(3, 0, -2))
      .normalize();
    expect(direction.x).toBeCloseTo(1 / Math.sqrt(3), 6);
    expect(direction.y).toBeCloseTo(1 / Math.sqrt(3), 6);
    expect(direction.z).toBeCloseTo(1 / Math.sqrt(3), 6);
    expect(camera.top - camera.bottom).toBe(12);
    expect(camera.right - camera.left).toBe(24);
  });

  it("uses a perpendicular Top camera and applies exact quarter turns", () => {
    const camera = createOpeningViewCamera();

    applyOpeningView(
      camera,
      { ...openingView, quarterTurns: 1 },
      "top",
      600,
      600,
    );

    expect(camera.position.x).toBeCloseTo(3, 6);
    expect(camera.position.y).toBeGreaterThan(0);
    expect(camera.position.z).toBeCloseTo(-2, 6);
    expect(camera.up.x).toBeCloseTo(-1, 6);
    expect(camera.up.z).toBeCloseTo(0, 6);
  });

  it("zooms out on portrait containers instead of cropping the authored span", () => {
    const camera = createOpeningViewCamera();

    applyOpeningView(camera, openingView, "top", 600, 1_200);

    expect(camera.right - camera.left).toBe(12);
    expect(camera.top - camera.bottom).toBe(24);
  });

  it("orbits between the exact canonical poses without changing center or radius", () => {
    const poses = deriveOpeningViewCameraPoses(openingView);
    const animated = createOpeningViewCamera();
    const canonical = createOpeningViewCamera();

    for (const [progress, mode] of [
      [0, "isometric"],
      [1, "top"],
    ] as const) {
      applyOpeningViewTransition(
        animated,
        openingView,
        poses,
        progress,
        900,
        600,
      );
      applyOpeningView(canonical, openingView, mode, 900, 600);

      expect(animated.position.distanceTo(canonical.position)).toBeCloseTo(
        0,
        8,
      );
      expect(animated.quaternion.angleTo(canonical.quaternion)).toBeCloseTo(
        0,
        6,
      );
    }

    applyOpeningViewTransition(animated, openingView, poses, 0.5, 900, 600);
    expect(animated.position.distanceTo(new Vector3(3, 0, -2))).toBeCloseTo(
      40,
      8,
    );
    expect(animated.top - animated.bottom).toBe(12);
  });

  it("derives an edge-free ground grid extent from the current frustum", () => {
    const camera = createOpeningViewCamera();

    applyOpeningView(camera, openingView, "isometric", 1200, 600);
    const bounds = deriveViewportGroundBounds(camera);

    for (const [x, y] of [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ] as const) {
      const near = new Vector3(x, y, -1).unproject(camera);
      const far = new Vector3(x, y, 1).unproject(camera);
      const direction = far.sub(near);
      const point = near.addScaledVector(direction, -near.y / direction.y);

      expect(point.x).toBeGreaterThan(bounds.minX);
      expect(point.x).toBeLessThan(bounds.maxX);
      expect(point.z).toBeGreaterThan(bounds.minZ);
      expect(point.z).toBeLessThan(bounds.maxZ);
    }
  });
});
