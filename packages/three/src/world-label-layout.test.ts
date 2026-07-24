import { Group, Object3D } from "three";
import { describe, expect, it } from "vitest";

import { layoutWorldSpaceLabels } from "./world-label-layout.js";

function label(
  role: "connection" | "group" | "node",
  width: number,
  depth: number,
): Object3D {
  const object = new Object3D();
  object.userData.labelBounds = { depth, width };
  object.userData.labelRole = role;
  return object;
}

describe("world-space label layout", () => {
  it("moves horizontal route labels along z until group and route labels stop overlapping", () => {
    const scene = new Group();
    const groupLabel = label("group", 2, 1);
    const firstRouteLabel = label("connection", 1.4, 0.4);
    const secondRouteLabel = label("connection", 1.4, 0.4);

    scene.add(groupLabel, firstRouteLabel, secondRouteLabel);
    layoutWorldSpaceLabels(scene);

    expect(firstRouteLabel.position.x).toBe(0);
    expect(secondRouteLabel.position.x).toBe(0);
    expect(Math.abs(firstRouteLabel.position.z)).toBeGreaterThan(0.5);
    expect(Math.abs(secondRouteLabel.position.z)).toBeGreaterThan(0.5);
    expect(firstRouteLabel.position.z).not.toBe(secondRouteLabel.position.z);
  });

  it("moves vertical route labels along x and ignores objects without label bounds", () => {
    const scene = new Group();
    const groupLabel = label("group", 1, 2);
    const routeLabel = label("connection", 0.4, 1.4);
    const semanticOnlyLabel = new Object3D();
    semanticOnlyLabel.userData.labelRole = "connection";

    scene.add(groupLabel, routeLabel, semanticOnlyLabel);
    layoutWorldSpaceLabels(scene);

    expect(Math.abs(routeLabel.position.x)).toBeGreaterThan(0.5);
    expect(routeLabel.position.z).toBe(0);
    expect(semanticOnlyLabel.position.toArray()).toEqual([0, 0, 0]);
  });

  it("places Node labels before Connection captions and resets their authored origin", () => {
    const scene = new Group();
    const groupLabel = label("group", 1.5, 0.6);
    const nodeLabel = label("node", 1.5, 0.4);
    const connectionLabel = label("connection", 1.5, 0.4);

    nodeLabel.userData.labelOrigin = { x: 0, z: 0 };
    nodeLabel.userData.labelShiftAxis = "z";
    connectionLabel.userData.labelOrigin = { x: 0, z: 0 };
    connectionLabel.userData.labelShiftAxis = "z";
    nodeLabel.position.z = 20;
    connectionLabel.position.z = 20;

    scene.add(groupLabel, nodeLabel, connectionLabel);
    layoutWorldSpaceLabels(scene);

    expect(Math.abs(nodeLabel.position.z)).toBeLessThan(5);
    expect(Math.abs(connectionLabel.position.z)).toBeLessThan(5);
    expect(nodeLabel.position.z).not.toBe(connectionLabel.position.z);
  });
});
