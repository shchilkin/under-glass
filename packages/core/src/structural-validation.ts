import type { z } from "zod";

import type { DiagnosticPath, DiagnosticSeverity } from "./diagnostics.js";

export type PersistedContractKind = "asset-definition" | "visualization";
export type StructuralDiagnosticCode =
  "invalid-structure" | "non-json-value" | "unsupported-schema-version";

export interface StructuralDiagnostic {
  readonly code: StructuralDiagnosticCode;
  readonly entityKind: PersistedContractKind;
  readonly message: string;
  readonly path: DiagnosticPath;
  readonly severity: DiagnosticSeverity;
}

export type StructuralParseResult<T> =
  | {
      readonly data: T;
      readonly success: true;
    }
  | {
      readonly diagnostics: StructuralDiagnostic[];
      readonly success: false;
    };

export class StructuralValidationError extends Error {
  readonly diagnostics: StructuralDiagnostic[];

  constructor(diagnostics: StructuralDiagnostic[]) {
    super(diagnostics[0]?.message ?? "Persisted contract validation failed.");
    this.name = "StructuralValidationError";
    this.diagnostics = diagnostics;
  }
}

interface ContractDescriptor {
  readonly currentSchemaVersion: number;
  readonly kind: PersistedContractKind;
  readonly label: string;
}

function formatPath(path: DiagnosticPath): string {
  return path.length === 0 ? "<root>" : path.join(".");
}

function isJsonPrimitive(input: unknown): boolean {
  return (
    input === null ||
    typeof input === "boolean" ||
    typeof input === "string" ||
    (typeof input === "number" && Number.isFinite(input))
  );
}

function findNonJsonArrayValue(
  input: unknown[],
  path: DiagnosticPath,
  ancestors: WeakSet<object>,
): DiagnosticPath | null {
  for (let index = 0; index < input.length; index += 1) {
    if (!Object.hasOwn(input, index)) {
      return [...path, index];
    }

    const invalidPath = findNonJsonValue(
      input[index],
      [...path, index],
      ancestors,
    );

    if (invalidPath !== null) {
      return invalidPath;
    }
  }

  return null;
}

function isPlainJsonObject(input: object): boolean {
  const prototype = Object.getPrototypeOf(input) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function findNonJsonPropertyValue(
  input: object,
  key: PropertyKey,
  path: DiagnosticPath,
  ancestors: WeakSet<object>,
): DiagnosticPath | null {
  const propertyPath = [
    ...path,
    typeof key === "symbol" ? (key.description ?? "<symbol>") : key,
  ];

  if (typeof key === "symbol") {
    return propertyPath;
  }

  const descriptor = Object.getOwnPropertyDescriptor(input, key);

  if (descriptor === undefined || !("value" in descriptor)) {
    return propertyPath;
  }

  return findNonJsonValue(descriptor.value, propertyPath, ancestors);
}

function findNonJsonObjectValue(
  input: object,
  path: DiagnosticPath,
  ancestors: WeakSet<object>,
): DiagnosticPath | null {
  if (!isPlainJsonObject(input)) {
    return path;
  }

  for (const key of Reflect.ownKeys(input)) {
    const invalidPath = findNonJsonPropertyValue(input, key, path, ancestors);

    if (invalidPath !== null) {
      return invalidPath;
    }
  }

  return null;
}

function findNonJsonValue(
  input: unknown,
  path: DiagnosticPath = [],
  ancestors: WeakSet<object> = new WeakSet(),
): DiagnosticPath | null {
  if (isJsonPrimitive(input)) {
    return null;
  }

  if (typeof input !== "object" || input === null) {
    return path;
  }

  if (ancestors.has(input)) {
    return path;
  }

  ancestors.add(input);
  const invalidPath = Array.isArray(input)
    ? findNonJsonArrayValue(input, path, ancestors)
    : findNonJsonObjectValue(input, path, ancestors);
  ancestors.delete(input);
  return invalidPath;
}

function toDiagnosticPath(path: readonly PropertyKey[]): DiagnosticPath {
  return path.map((segment) =>
    typeof segment === "number" || typeof segment === "string"
      ? segment
      : (segment.description ?? "<symbol>"),
  );
}

function expectedDescription(issue: z.core.$ZodIssue): string | null {
  if (!("expected" in issue) || typeof issue.expected !== "string") {
    return null;
  }

  const article = /^[aeiou]/u.test(issue.expected) ? "an" : "a";
  return `${article} ${issue.expected}`;
}

export function safeParsePersistedContract<T>(
  input: unknown,
  schema: z.ZodType<T>,
  descriptor: ContractDescriptor,
): StructuralParseResult<T> {
  const nonJsonPath = findNonJsonValue(input);

  if (nonJsonPath !== null) {
    return {
      success: false,
      diagnostics: [
        {
          code: "non-json-value",
          entityKind: descriptor.kind,
          message: `${descriptor.label} contains a non-JSON value at "${formatPath(nonJsonPath)}".`,
          path: nonJsonPath,
          severity: "error",
        },
      ],
    };
  }

  if (
    typeof input === "object" &&
    input !== null &&
    !Array.isArray(input) &&
    Object.hasOwn(input, "schemaVersion")
  ) {
    const schemaVersion = (input as Record<string, unknown>).schemaVersion;

    if (
      typeof schemaVersion === "number" &&
      schemaVersion !== descriptor.currentSchemaVersion
    ) {
      return {
        success: false,
        diagnostics: [
          {
            code: "unsupported-schema-version",
            entityKind: descriptor.kind,
            message: `${descriptor.label} schema version ${schemaVersion} is not supported.`,
            path: ["schemaVersion"],
            severity: "error",
          },
        ],
      };
    }
  }

  const result = schema.safeParse(input);

  if (result.success) {
    return result;
  }

  return {
    success: false,
    diagnostics: result.error.issues.map((issue) => {
      const path = toDiagnosticPath(issue.path);
      const expected = expectedDescription(issue);

      return {
        code: "invalid-structure",
        entityKind: descriptor.kind,
        message: `${descriptor.label} has invalid structure at "${formatPath(path)}"${expected === null ? "" : `: expected ${expected}`}.`,
        path,
        severity: "error",
      };
    }),
  };
}

export function parsePersistedContract<T>(
  input: unknown,
  schema: z.ZodType<T>,
  descriptor: ContractDescriptor,
): T {
  const result = safeParsePersistedContract(input, schema, descriptor);

  if (!result.success) {
    throw new StructuralValidationError(result.diagnostics);
  }

  return result.data;
}
