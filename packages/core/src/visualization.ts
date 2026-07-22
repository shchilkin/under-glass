import { z } from "zod";

export const CURRENT_SCHEMA_VERSION: 1 = 1;

export type JsonValue =
  boolean | number | string | null | JsonValue[] | { [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const metadataSchema: z.ZodRecord<z.ZodString, z.ZodType<JsonValue>> = z.record(
  z.string(),
  jsonValueSchema,
);

const quarterTurnsSchema: z.ZodType<0 | 1 | 2 | 3> = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

const groundPointSchema: z.ZodObject<
  {
    x: z.ZodNumber;
    z: z.ZodNumber;
  },
  z.core.$strict
> = z.strictObject({
  x: z.number().finite(),
  z: z.number().finite(),
});

const groundBoundsSchema: z.ZodObject<
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

const sourceReferenceSchema: z.ZodObject<
  {
    sourceId: z.ZodString;
    entityId: z.ZodString;
    viewId: z.ZodOptional<z.ZodString>;
  },
  z.core.$strict
> = z.strictObject({
  sourceId: z.string().min(1),
  entityId: z.string().min(1),
  viewId: z.string().min(1).optional(),
});

const nodeSchema: z.ZodObject<
  {
    id: z.ZodString;
    label: z.ZodString;
    assetId: z.ZodString;
    position: typeof groundPointSchema;
    quarterTurns: typeof quarterTurnsSchema;
    groupId: z.ZodOptional<z.ZodString>;
    styleKey: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<typeof metadataSchema>;
    sourceReference: z.ZodOptional<typeof sourceReferenceSchema>;
  },
  z.core.$strict
> = z.strictObject({
  id: z.string().min(1),
  label: z.string(),
  assetId: z.string().min(1),
  position: groundPointSchema,
  quarterTurns: quarterTurnsSchema,
  groupId: z.string().min(1).optional(),
  styleKey: z.string().min(1).optional(),
  metadata: metadataSchema.optional(),
  sourceReference: sourceReferenceSchema.optional(),
});

const groupSchema: z.ZodObject<
  {
    id: z.ZodString;
    label: z.ZodOptional<z.ZodString>;
    bounds: typeof groundBoundsSchema;
    styleKey: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<typeof metadataSchema>;
    sourceReference: z.ZodOptional<typeof sourceReferenceSchema>;
  },
  z.core.$strict
> = z.strictObject({
  id: z.string().min(1),
  label: z.string().optional(),
  bounds: groundBoundsSchema,
  styleKey: z.string().min(1).optional(),
  metadata: metadataSchema.optional(),
  sourceReference: sourceReferenceSchema.optional(),
});

const connectionEndpointSchema: z.ZodObject<
  {
    nodeId: z.ZodString;
    portId: z.ZodOptional<z.ZodString>;
  },
  z.core.$strict
> = z.strictObject({
  nodeId: z.string().min(1),
  portId: z.string().min(1).optional(),
});

const routeAnchorSchema: z.ZodObject<
  {
    id: z.ZodString;
    position: typeof groundPointSchema;
  },
  z.core.$strict
> = z.strictObject({
  id: z.string().min(1),
  position: groundPointSchema,
});

const connectionSchema: z.ZodObject<
  {
    id: z.ZodString;
    label: z.ZodString;
    source: typeof connectionEndpointSchema;
    target: typeof connectionEndpointSchema;
    direction: z.ZodEnum<{
      undirected: "undirected";
      oneWay: "oneWay";
      bidirectional: "bidirectional";
    }>;
    routeAnchors: z.ZodArray<typeof routeAnchorSchema>;
    styleKey: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<typeof metadataSchema>;
    sourceReference: z.ZodOptional<typeof sourceReferenceSchema>;
  },
  z.core.$strict
> = z.strictObject({
  id: z.string().min(1),
  label: z.string(),
  source: connectionEndpointSchema,
  target: connectionEndpointSchema,
  direction: z.enum(["undirected", "oneWay", "bidirectional"]),
  routeAnchors: z.array(routeAnchorSchema),
  styleKey: z.string().min(1).optional(),
  metadata: metadataSchema.optional(),
  sourceReference: sourceReferenceSchema.optional(),
});

const openingViewSchema: z.ZodObject<
  {
    cameraMode: z.ZodEnum<{
      isometric: "isometric";
      top: "top";
    }>;
    quarterTurns: typeof quarterTurnsSchema;
    center: typeof groundPointSchema;
    zoom: z.ZodNumber;
  },
  z.core.$strict
> = z.strictObject({
  cameraMode: z.enum(["isometric", "top"]),
  quarterTurns: quarterTurnsSchema,
  center: groundPointSchema,
  zoom: z.number().positive().finite(),
});

export const visualizationSchema: z.ZodObject<
  {
    schemaVersion: z.ZodLiteral<1>;
    nodes: z.ZodArray<typeof nodeSchema>;
    groups: z.ZodArray<typeof groupSchema>;
    connections: z.ZodArray<typeof connectionSchema>;
    openingView: typeof openingViewSchema;
  },
  z.core.$strict
> = z.strictObject({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  nodes: z.array(nodeSchema),
  groups: z.array(groupSchema),
  connections: z.array(connectionSchema),
  openingView: openingViewSchema,
});

export type Connection = z.output<typeof connectionSchema>;
export type ConnectionEndpoint = z.output<typeof connectionEndpointSchema>;
export type GroundBounds = z.output<typeof groundBoundsSchema>;
export type GroundPoint = z.output<typeof groundPointSchema>;
export type Group = z.output<typeof groupSchema>;
export type Node = z.output<typeof nodeSchema>;
export type OpeningView = z.output<typeof openingViewSchema>;
export type QuarterTurns = z.output<typeof quarterTurnsSchema>;
export type RouteAnchor = z.output<typeof routeAnchorSchema>;
export type SourceReference = z.output<typeof sourceReferenceSchema>;
export type Visualization = z.output<typeof visualizationSchema>;

export function parseVisualization(input: unknown): Visualization {
  return visualizationSchema.parse(input);
}

export function safeParseVisualization(
  input: unknown,
): z.ZodSafeParseResult<Visualization> {
  return visualizationSchema.safeParse(input);
}
