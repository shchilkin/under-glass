import { z } from "zod";

import {
  parsePersistedContract,
  safeParsePersistedContract,
  type StructuralParseResult,
} from "./structural-validation.js";
import { groundCoordinatesSchema, groundRectangleSchema } from "./geometry.js";

export const ASSET_DEFINITION_SCHEMA_VERSION: 1 = 1;

const assetLocalPointSchema: z.ZodObject<
  {
    x: z.ZodNumber;
    y: z.ZodNumber;
    z: z.ZodNumber;
  },
  z.core.$strict
> = z.strictObject({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
});

const groundNormalSchema: typeof groundCoordinatesSchema =
  groundCoordinatesSchema;

const quaternionSchema: z.ZodObject<
  {
    x: z.ZodNumber;
    y: z.ZodNumber;
    z: z.ZodNumber;
    w: z.ZodNumber;
  },
  z.core.$strict
> = z.strictObject({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
  w: z.number().finite(),
});

const assetFootprintSchema: typeof groundRectangleSchema =
  groundRectangleSchema;

const assetProvenanceSchema: z.ZodObject<
  {
    license: z.ZodString;
    source: z.ZodString;
    author: z.ZodOptional<z.ZodString>;
    copyright: z.ZodOptional<z.ZodString>;
  },
  z.core.$strict
> = z.strictObject({
  license: z.string().min(1),
  source: z.string().min(1),
  author: z.string().min(1).optional(),
  copyright: z.string().min(1).optional(),
});

const connectionPortSchema: z.ZodObject<
  {
    id: z.ZodString;
    position: typeof assetLocalPointSchema;
    normal: typeof groundNormalSchema;
  },
  z.core.$strict
> = z.strictObject({
  id: z.string().min(1),
  position: assetLocalPointSchema,
  normal: groundNormalSchema,
});

export const assetDefinitionSchema: z.ZodObject<
  {
    schemaVersion: z.ZodLiteral<1>;
    assetId: z.ZodString;
    scale: z.ZodNumber;
    normalizationRotation: typeof quaternionSchema;
    groundContact: typeof assetLocalPointSchema;
    footprint: typeof assetFootprintSchema;
    provenance: typeof assetProvenanceSchema;
    connectionPorts: z.ZodOptional<z.ZodArray<typeof connectionPortSchema>>;
  },
  z.core.$strict
> = z.strictObject({
  schemaVersion: z.literal(ASSET_DEFINITION_SCHEMA_VERSION),
  assetId: z.string().min(1),
  scale: z.number().positive().finite(),
  normalizationRotation: quaternionSchema,
  groundContact: assetLocalPointSchema,
  footprint: assetFootprintSchema,
  provenance: assetProvenanceSchema,
  connectionPorts: z.array(connectionPortSchema).optional(),
});

export type AssetDefinition = z.output<typeof assetDefinitionSchema>;
export type AssetFootprint = z.output<typeof assetFootprintSchema>;
export type AssetLocalPoint = z.output<typeof assetLocalPointSchema>;
export type AssetProvenance = z.output<typeof assetProvenanceSchema>;
export type ConnectionPort = z.output<typeof connectionPortSchema>;
export type GroundNormal = z.output<typeof groundNormalSchema>;
export type Quaternion = z.output<typeof quaternionSchema>;

export function parseAssetDefinition(input: unknown): AssetDefinition {
  return parsePersistedContract(input, assetDefinitionSchema, {
    currentSchemaVersion: ASSET_DEFINITION_SCHEMA_VERSION,
    kind: "asset-definition",
    label: "Asset Definition",
  });
}

export function safeParseAssetDefinition(
  input: unknown,
): StructuralParseResult<AssetDefinition> {
  return safeParsePersistedContract(input, assetDefinitionSchema, {
    currentSchemaVersion: ASSET_DEFINITION_SCHEMA_VERSION,
    kind: "asset-definition",
    label: "Asset Definition",
  });
}
