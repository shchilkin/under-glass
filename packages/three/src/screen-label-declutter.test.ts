import {
  Group,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
} from "three";
import { describe, expect, it } from "vitest";

import { declutterWorldSpaceLabels } from "./screen-label-declutter.js";

function label(
  role: "connection" | "group" | "node",
  text: string,
  x = 0,
): Mesh {
  const object = new Mesh(new PlaneGeometry(1.5, 0.5), new MeshBasicMaterial());
  object.position.x = x;
  object.userData.labelRole = role;
  object.userData.text = text;
  return object;
}

function camera(): OrthographicCamera {
  const result = new OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
  result.position.z = 10;
  result.lookAt(0, 0, 0);
  result.updateMatrixWorld();
  return result;
}

describe("screen-space decluttering for world-space labels", () => {
  it("keeps Node identity before Group and Connection detail", () => {
    const scene = new Group();
    const node = label("node", "API");
    const group = label("group", "Runtime");
    const connection = label("connection", "HTTPS");
    scene.add(connection, group, node);

    const hiddenCount = declutterWorldSpaceLabels(scene, camera(), 600, 1_000);

    expect(hiddenCount).toBe(2);
    expect(node.visible).toBe(true);
    expect(group.visible).toBe(false);
    expect(connection.visible).toBe(false);
  });

  it("protects Node and Group labels at ordinary desktop widths", () => {
    const scene = new Group();
    const node = label("node", "API");
    const group = label("group", "Runtime");
    const connection = label("connection", "HTTPS");
    scene.add(connection, group, node);

    const hiddenCount = declutterWorldSpaceLabels(
      scene,
      camera(),
      1_000,
      1_000,
    );

    expect(hiddenCount).toBe(1);
    expect(node.visible).toBe(true);
    expect(group.visible).toBe(true);
    expect(connection.visible).toBe(false);
  });

  it("keeps separated labels and restores labels hidden by a denser pose", () => {
    const scene = new Group();
    const first = label("node", "Browser", -3);
    const second = label("node", "API", 3);
    first.visible = false;
    first.userData.labelDecluttered = true;
    scene.add(first, second);

    const hiddenCount = declutterWorldSpaceLabels(
      scene,
      camera(),
      1_000,
      1_000,
    );

    expect(hiddenCount).toBe(0);
    expect(first.visible).toBe(true);
    expect(first.userData.labelDecluttered).toBe(false);
    expect(second.visible).toBe(true);
  });
});
