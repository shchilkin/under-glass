import { describe, expect, it } from "vitest";

import {
  beginCameraModeTransition,
  cameraMotionProfileDuration,
  sampleCameraModeTransition,
  sampleCameraMotionProfile,
} from "./camera-mode-transition.js";
import type { CameraMotion } from "./types.js";

describe("Camera Motion profiles", () => {
  it("gives each supported profile its deliberately tuned duration", () => {
    expect(cameraMotionProfileDuration("responsive")).toBe(440);
    expect(cameraMotionProfileDuration("spring")).toBe(650);
  });

  it("keeps exact endpoints while giving each profile a distinct midpoint", () => {
    const profiles: CameraMotion[] = ["responsive", "spring"];

    for (const profile of profiles) {
      expect(sampleCameraMotionProfile(profile, 0)).toBe(0);
      expect(sampleCameraMotionProfile(profile, 1)).toBe(1);
    }

    expect(sampleCameraMotionProfile("responsive", 0.5)).toBeCloseTo(0.9375, 6);
  });

  it("limits Spring overshoot to the agreed three-to-four percent range", () => {
    const samples = Array.from({ length: 199 }, (_, index) =>
      sampleCameraMotionProfile("spring", (index + 1) / 200),
    );
    const peak = Math.max(...samples);

    expect(peak).toBeGreaterThanOrEqual(1.03);
    expect(peak).toBeLessThanOrEqual(1.04);
  });

  it("settles Spring continuously into its exact canonical endpoint", () => {
    const transition = beginCameraModeTransition({
      from: 0,
      now: 0,
      profile: "spring",
      to: 1,
      velocity: 0,
    });
    const almostSettled = sampleCameraModeTransition(
      transition,
      transition.duration - 0.001,
    );

    expect(almostSettled.progress).toBeCloseTo(1, 8);
    expect(almostSettled.velocity).toBeCloseTo(0, 8);
    expect(sampleCameraModeTransition(transition, transition.duration)).toEqual(
      {
        complete: true,
        progress: 1,
        velocity: 0,
      },
    );
  });

  it("scales even very short retarget durations continuously by distance", () => {
    const transition = beginCameraModeTransition({
      from: 0.9,
      now: 0,
      profile: "responsive",
      to: 1,
      velocity: 0,
    });

    expect(transition.duration).toBeCloseTo(44, 8);
  });

  it("retargets from the current progress and velocity without a jump", () => {
    const forward = beginCameraModeTransition({
      from: 0,
      now: 1_000,
      profile: "responsive",
      to: 1,
      velocity: 0,
    });
    const moving = sampleCameraModeTransition(forward, 1_220);
    const reverse = beginCameraModeTransition({
      from: moving.progress,
      now: 1_220,
      profile: "responsive",
      to: 0,
      velocity: moving.velocity,
    });
    const retargeted = sampleCameraModeTransition(reverse, 1_220);

    expect(retargeted.progress).toBeCloseTo(moving.progress, 8);
    expect(retargeted.velocity).toBeCloseTo(moving.velocity, 8);
    expect(reverse.duration).toBeLessThan(
      cameraMotionProfileDuration("responsive"),
    );

    const settled = sampleCameraModeTransition(
      reverse,
      reverse.startedAt + reverse.duration,
    );
    expect(settled).toEqual({
      complete: true,
      progress: 0,
      velocity: 0,
    });
  });
});
