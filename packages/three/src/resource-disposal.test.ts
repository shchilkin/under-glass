import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from "three";
import { describe, expect, it, vi } from "vitest";

import { disposeObjectResourceRoots } from "./resource-disposal.js";

describe("renderer resource disposal", () => {
  it("disposes shared GPU resources once across every renderer-owned root", () => {
    const geometry = new BoxGeometry();
    const texture = new Texture();
    const material = new MeshStandardMaterial({ map: texture });
    const geometryDispose = vi.spyOn(geometry, "dispose");
    const textureDispose = vi.spyOn(texture, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");
    const firstRoot = new Group();
    const secondRoot = new Group();

    firstRoot.add(new Mesh(geometry, material));
    secondRoot.add(new Mesh(geometry, material));

    disposeObjectResourceRoots([firstRoot, secondRoot]);

    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
    expect(textureDispose).toHaveBeenCalledOnce();
  });
});
