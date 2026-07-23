import { mkdir, writeFile } from "node:fs/promises";

import { format } from "prettier";
import { toJSONSchema } from "zod";

import { assetDefinitionSchema, visualizationSchema } from "../dist/index.js";

const schemaDirectory = new URL("../schema/", import.meta.url);
await mkdir(schemaDirectory, { recursive: true });

for (const definition of [
  {
    fileName: "asset-definition.schema.json",
    id: "urn:under-glass:schema:asset-definition:v1",
    schema: assetDefinitionSchema,
    title: "Under Glass Asset Definition v1",
  },
  {
    fileName: "visualization.schema.json",
    id: "urn:under-glass:schema:visualization:v1",
    schema: visualizationSchema,
    title: "Under Glass Visualization v1",
  },
]) {
  const jsonSchema = toJSONSchema(definition.schema, {
    cycles: "ref",
    target: "draft-2020-12",
  });

  jsonSchema.$id = definition.id;
  jsonSchema.title = definition.title;

  await writeFile(
    new URL(definition.fileName, schemaDirectory),
    await format(JSON.stringify(jsonSchema), { parser: "json" }),
  );
}
