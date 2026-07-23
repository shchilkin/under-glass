/// <reference types="node" />

import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";
import { toJSONSchema } from "zod";

import { assetDefinitionSchema, visualizationSchema } from "./index.js";

async function readCheckedInSchema(fileName: string): Promise<unknown> {
  const schemaUrl = new URL(`../schema/${fileName}`, import.meta.url);

  return JSON.parse(await readFile(schemaUrl, "utf8")) as unknown;
}

describe("published JSON Schemas", () => {
  it.each([
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
  ])("keeps $fileName synchronized with its Zod contract", async (contract) => {
    const expected = toJSONSchema(contract.schema, {
      cycles: "ref",
      target: "draft-2020-12",
    });

    expected.$id = contract.id;
    expected.title = contract.title;

    await expect(readCheckedInSchema(contract.fileName)).resolves.toEqual(
      expected,
    );
  });
});
