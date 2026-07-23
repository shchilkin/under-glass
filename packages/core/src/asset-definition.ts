import { z } from "zod";

export const ASSET_DEFINITION_SCHEMA_VERSION: 1 = 1;

const assetPointSchema: z.ZodObject<
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

const groundNormalSchema: z.ZodObject<
  {
    x: z.ZodNumber;
    z: z.ZodNumber;
  },
  z.core.$strict
> = z.strictObject({
  x: z.number().finite(),
  z: z.number().finite(),
});

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

const assetFootprintSchema: z.ZodObject<
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
    position: typeof assetPointSchema;
    normal: typeof groundNormalSchema;
  },
  z.core.$strict
> = z.strictObject({
  id: z.string().min(1),
  position: assetPointSchema,
  normal: groundNormalSchema,
});

export const assetDefinitionSchema: z.ZodObject<
  {
    schemaVersion: z.ZodLiteral<1>;
    assetId: z.ZodString;
    scale: z.ZodNumber;
    normalizationRotation: typeof quaternionSchema;
    groundContact: typeof assetPointSchema;
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
  groundContact: assetPointSchema,
  footprint: assetFootprintSchema,
  provenance: assetProvenanceSchema,
  connectionPorts: z.array(connectionPortSchema).optional(),
});

export type AssetDefinition = z.output<typeof assetDefinitionSchema>;
export type AssetFootprint = z.output<typeof assetFootprintSchema>;
export type AssetPoint = z.output<typeof assetPointSchema>;
export type AssetProvenance = z.output<typeof assetProvenanceSchema>;
export type ConnectionPort = z.output<typeof connectionPortSchema>;
export type GroundNormal = z.output<typeof groundNormalSchema>;
export type Quaternion = z.output<typeof quaternionSchema>;

export function parseAssetDefinition(input: unknown): AssetDefinition {
  return assetDefinitionSchema.parse(input);
}

export function safeParseAssetDefinition(
  input: unknown,
): z.ZodSafeParseResult<AssetDefinition> {
  return assetDefinitionSchema.safeParse(input);
}
