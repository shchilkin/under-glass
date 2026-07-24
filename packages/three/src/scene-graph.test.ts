import {
  BufferAttribute,
  CylinderGeometry,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
} from "three";
import { describe, expect, it } from "vitest";

import type { BasicConnectionRoute, Group, Node } from "@under-glass/core";

import {
  createConnectionRoute,
  createGroupSurface,
  createInfiniteGrid,
  createNodeLabel,
  DEFAULT_SCENE_THEME,
  updateInfiniteGrid,
} from "./scene-graph.js";
import { applyOpeningView, createOpeningViewCamera } from "./scene-camera.js";

function meshNamed(root: Object3D, name: string): Mesh {
  const mesh = root.getObjectByName(name);

  expect(mesh).toBeInstanceOf(Mesh);
  return mesh as Mesh;
}

const route: BasicConnectionRoute = {
  connectionId: "request",
  direction: "oneWay",
  label: "Request",
  points: [
    { x: 0, z: 0 },
    { x: 2, z: 0 },
  ],
  sourcePort: { x: 0, z: 0 },
  targetPort: { x: 2, z: 0 },
};

describe("project graph presentation", () => {
  it("keeps major grid lines on stable world-space multiples of four", () => {
    const camera = createOpeningViewCamera();
    const grid = createInfiniteGrid();

    for (const [width, height, mode] of [
      [600, 900, "isometric"],
      [1200, 500, "top"],
    ] as const) {
      applyOpeningView(
        camera,
        {
          cameraMode: mode,
          quarterTurns: 0,
          center: { x: 1.25, z: -2.75 },
          groundSpan: 10,
        },
        mode,
        width,
        height,
      );
      updateInfiniteGrid(grid, camera);

      const majorLines = grid.children[1];
      expect(majorLines).toBeInstanceOf(LineSegments);
      const position = (majorLines as LineSegments).geometry.getAttribute(
        "position",
      );

      expect(position).toBeInstanceOf(BufferAttribute);
      for (
        let index = 0;
        index < (position as BufferAttribute).count;
        index += 2
      ) {
        const startX = (position as BufferAttribute).getX(index);
        const startZ = (position as BufferAttribute).getZ(index);
        const endX = (position as BufferAttribute).getX(index + 1);
        const endZ = (position as BufferAttribute).getZ(index + 1);

        if (startX === endX) {
          expect(Math.abs(startX % 4)).toBe(0);
        } else {
          expect(startZ).toBe(endZ);
          expect(Math.abs(startZ % 4)).toBe(0);
        }
      }
    }
  });

  it("renders Groups as flat tinted regions with a visible border", () => {
    const group: Group = {
      id: "core",
      label: "Core",
      bounds: { minX: -2, minZ: -1, maxX: 3, maxZ: 4 },
    };
    const presentation = createGroupSurface(group);
    const surface = meshNamed(presentation, "Group Surface");
    const border = presentation.getObjectByName("Group Border");

    expect(presentation.userData.groupLabel).toEqual({
      rendering: "world-space",
      text: "Core",
    });
    expect(surface.rotation.x).toBeCloseTo(-Math.PI / 2, 6);
    expect(surface.receiveShadow).toBe(true);
    expect((surface.material as MeshStandardMaterial).color.getHex()).toBe(
      DEFAULT_SCENE_THEME.groupSurface,
    );
    expect(border).toBeInstanceOf(LineLoop);
    expect((border as LineLoop).material).toBeInstanceOf(LineBasicMaterial);
    expect(
      ((border as LineLoop).material as LineBasicMaterial).color.getHex(),
    ).toBe(DEFAULT_SCENE_THEME.groupBorder);
  });

  it("marks Node names for world-space rendering", () => {
    const node: Node = {
      assetId: "service",
      id: "api",
      label: "API",
      position: { x: 2, z: 3 },
      quarterTurns: 0,
    };
    const presentation = createNodeLabel(node);

    expect(presentation.userData.nodeLabel).toEqual({
      rendering: "world-space",
      text: "API",
    });
  });

  it("maps host-defined Group Style Keys to distinct quiet regions", () => {
    const group: Group = {
      id: "data",
      label: "Data",
      bounds: { minX: -2, minZ: -1, maxX: 3, maxZ: 4 },
      styleKey: "data",
    };
    const presentation = createGroupSurface(group);
    const surface = meshNamed(presentation, "Group Surface");
    const border = presentation.getObjectByName("Group Border") as LineLoop;

    expect((surface.material as MeshStandardMaterial).color.getHex()).toBe(
      DEFAULT_SCENE_THEME.groupDataSurface,
    );
    expect((border.material as LineBasicMaterial).color.getHex()).toBe(
      DEFAULT_SCENE_THEME.groupDataBorder,
    );
  });

  it("falls back to the default Group treatment for unknown Style Keys", () => {
    const group: Group = {
      id: "future",
      label: "Future",
      bounds: { minX: -2, minZ: -1, maxX: 3, maxZ: 4 },
      styleKey: "host-defined-but-unmapped",
    };
    const presentation = createGroupSurface(group);
    const surface = meshNamed(presentation, "Group Surface");
    const border = presentation.getObjectByName("Group Border") as LineLoop;

    expect((surface.material as MeshStandardMaterial).color.getHex()).toBe(
      DEFAULT_SCENE_THEME.groupSurface,
    );
    expect((border.material as LineBasicMaterial).color.getHex()).toBe(
      DEFAULT_SCENE_THEME.groupBorder,
    );
  });

  it("renders a one-way route with a forward arrow at the target", () => {
    const presentation = createConnectionRoute(route);
    const arrow = meshNamed(presentation, "Forward Arrow");

    expect(presentation.userData.routeLabel).toEqual({
      rendering: "world-space",
      text: "Request",
    });
    expect(arrow.position.x).toBeCloseTo(1.94, 6);
    expect(arrow.position.z).toBeCloseTo(0, 6);
    expect(presentation.getObjectByName("Backward Arrow")).toBeUndefined();
  });

  it("falls back to the default connection treatment for unknown Style Keys", () => {
    const presentation = createConnectionRoute({
      ...route,
      styleKey: "host-defined-but-unmapped",
    });
    const segment = meshNamed(presentation, "Route Segment");

    expect((segment.material as MeshStandardMaterial).color.getHex()).toBe(
      DEFAULT_SCENE_THEME.connection,
    );
    expect((segment.material as MeshStandardMaterial).roughness).toBe(0.4);
  });

  it("distinguishes primary, supporting, and telemetry routes", () => {
    const primary = meshNamed(
      createConnectionRoute({ ...route, styleKey: "primary" }),
      "Route Segment",
    );
    const supporting = meshNamed(
      createConnectionRoute({ ...route, styleKey: "supporting" }),
      "Route Segment",
    );
    const telemetry = meshNamed(
      createConnectionRoute({ ...route, styleKey: "telemetry" }),
      "Route Segment",
    );

    expect((primary.material as MeshStandardMaterial).color.getHex()).toBe(
      DEFAULT_SCENE_THEME.connection,
    );
    expect((supporting.material as MeshStandardMaterial).color.getHex()).toBe(
      DEFAULT_SCENE_THEME.supportingConnection,
    );
    expect((telemetry.material as MeshStandardMaterial).color.getHex()).toBe(
      DEFAULT_SCENE_THEME.secondaryConnection,
    );
    expect(
      (primary.geometry as CylinderGeometry).parameters.radiusTop,
    ).toBeGreaterThan(
      (supporting.geometry as CylinderGeometry).parameters.radiusTop,
    );
    expect(
      (primary.geometry as CylinderGeometry).parameters.radiusTop,
    ).toBeGreaterThan(
      (telemetry.geometry as CylinderGeometry).parameters.radiusTop,
    );
  });
});
