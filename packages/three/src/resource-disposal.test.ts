import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from "three";
import { describe, expect, it, vi } from "vitest";

import { disposeObjectResourceRoots } from "./resource-disposal.js";

describe("renderer resource disposal", () => {
  it("disposes shared GPU resources once across every renderer-owned root", () => {
    const geometry = new BoxGeometry();
    const texture = new Texture();
    const firstMaterial = new MeshStandardMaterial({ map: texture });
    const secondMaterial = new MeshStandardMaterial({ map: texture });
    const geometryDispose = vi.spyOn(geometry, "dispose");
    const textureDispose = vi.spyOn(texture, "dispose");
    const firstMaterialDispose = vi.spyOn(firstMaterial, "dispose");
    const secondMaterialDispose = vi.spyOn(secondMaterial, "dispose");
    const firstRoot = new Group();
    const secondRoot = new Group();

    firstRoot.add(new Mesh(geometry, firstMaterial));
    secondRoot.add(new Mesh(geometry, secondMaterial));

    disposeObjectResourceRoots([firstRoot, secondRoot]);

    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(firstMaterialDispose).toHaveBeenCalledOnce();
    expect(secondMaterialDispose).toHaveBeenCalledOnce();
    expect(textureDispose).toHaveBeenCalledOnce();
  });
});
