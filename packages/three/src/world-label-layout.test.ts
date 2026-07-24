import { Group, Object3D } from "three";
import { describe, expect, it } from "vitest";

import { separateWorldSpaceConnectionLabels } from "./world-label-layout.js";

function label(
  role: "connection" | "group",
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
    separateWorldSpaceConnectionLabels(scene);

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
    separateWorldSpaceConnectionLabels(scene);

    expect(Math.abs(routeLabel.position.x)).toBeGreaterThan(0.5);
    expect(routeLabel.position.z).toBe(0);
    expect(semanticOnlyLabel.position.toArray()).toEqual([0, 0, 0]);
  });
});
