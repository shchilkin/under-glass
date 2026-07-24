import { describe, expect, it } from "vitest";

import {
  findUnoccupiedLabelCenter,
  labelRectangle,
  rectanglesOverlap,
} from "./label-layout.js";

describe("projected label layout", () => {
  it("keeps an unobstructed label at its route anchor", () => {
    expect(
      findUnoccupiedLabelCenter(
        { x: 240, y: 120 },
        { height: 20, width: 80 },
        [],
        { height: 300, width: 500 },
      ),
    ).toEqual({ x: 240, y: 120 });
  });

  it("moves a connection label to the nearest free bounded slot", () => {
    const occupied = [
      labelRectangle({ x: 240, y: 120 }, { height: 24, width: 120 }),
      labelRectangle({ x: 240, y: 92 }, { height: 20, width: 80 }),
    ];
    const position = findUnoccupiedLabelCenter(
      { x: 240, y: 120 },
      { height: 20, width: 80 },
      occupied,
      { height: 300, width: 500 },
    );
    const placed = labelRectangle(position, { height: 20, width: 80 });

    expect(position).toEqual({ x: 240, y: 148 });
    expect(
      occupied.some((rectangle) => rectanglesOverlap(placed, rectangle)),
    ).toBe(false);
  });
});
