import { mkdir, writeFile } from "node:fs/promises";

import { format } from "prettier";
import { toJSONSchema } from "zod";

import { visualizationSchema } from "../dist/index.js";

const schemaDirectory = new URL("../schema/", import.meta.url);
const schemaPath = new URL("visualization.schema.json", schemaDirectory);
const schema = toJSONSchema(visualizationSchema, {
  cycles: "ref",
  target: "draft-2020-12",
});

schema.$id = "urn:under-glass:schema:visualization:v1";
schema.title = "Under Glass Visualization v1";

await mkdir(schemaDirectory, { recursive: true });
await writeFile(
  schemaPath,
  await format(JSON.stringify(schema), { parser: "json" }),
);
