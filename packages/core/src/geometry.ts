import { z } from "zod";

import type { GroundPoint } from "./visualization.js";

export function groundPointsEqual(
  first: GroundPoint,
  second: GroundPoint,
): boolean {
  return first.x === second.x && first.z === second.z;
}

export const groundCoordinatesSchema: z.ZodObject<
  {
    x: z.ZodNumber;
    z: z.ZodNumber;
  },
  z.core.$strict
> = z.strictObject({
  x: z.number().finite(),
  z: z.number().finite(),
});

export const groundRectangleSchema: z.ZodObject<
  {
    minX: z.ZodNumber;
    minZ: z.ZodNumber;
    maxX: z.ZodNumber;
    maxZ: z.ZodNumber;
  },
  z.core.$strict
> = z.strictObject({
  minX: z.number().finite(),
  minZ: z.number().finite(),
  maxX: z.number().finite(),
  maxZ: z.number().finite(),
});
