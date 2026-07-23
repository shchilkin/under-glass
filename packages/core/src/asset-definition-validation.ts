import type { AssetDefinition } from "./asset-definition.js";
import type { DiagnosticPath, DiagnosticSeverity } from "./diagnostics.js";

export type AssetDefinitionDiagnosticCode =
  | "duplicate-connection-port-id"
  | "inward-connection-port-normal"
  | "invalid-footprint"
  | "non-unit-connection-port-normal"
  | "non-unit-normalization-rotation";
export type AssetDefinitionDiagnosticPath = DiagnosticPath;

export interface AssetDefinitionDiagnostic {
  readonly code: AssetDefinitionDiagnosticCode;
  readonly entityId: string;
  readonly entityKind: "asset-definition" | "connection-port";
  readonly message: string;
  readonly path: AssetDefinitionDiagnosticPath;
  readonly severity: DiagnosticSeverity;
}

const UNIT_VECTOR_TOLERANCE = 1e-6;

export function validateAssetDefinitionSemantics(
  assetDefinition: AssetDefinition,
): AssetDefinitionDiagnostic[] {
  const diagnostics: AssetDefinitionDiagnostic[] = [];
  const rotation = assetDefinition.normalizationRotation;
  const rotationLength = Math.hypot(
    rotation.x,
    rotation.y,
    rotation.z,
    rotation.w,
  );

  if (Math.abs(rotationLength - 1) > UNIT_VECTOR_TOLERANCE) {
    diagnostics.push({
      code: "non-unit-normalization-rotation",
      entityId: assetDefinition.assetId,
      entityKind: "asset-definition",
      message: `Asset Definition "${assetDefinition.assetId}" normalization rotation must be a unit quaternion.`,
      path: ["normalizationRotation"],
      severity: "error",
    });
  }

  const footprint = assetDefinition.footprint;

  if (footprint.minX >= footprint.maxX || footprint.minZ >= footprint.maxZ) {
    diagnostics.push({
      code: "invalid-footprint",
      entityId: assetDefinition.assetId,
      entityKind: "asset-definition",
      message: `Asset Definition "${assetDefinition.assetId}" footprint must have positive width and depth.`,
      path: ["footprint"],
      severity: "error",
    });
  }

  const declaredPortIds = new Set<string>();
  const footprintCenterX = (footprint.minX + footprint.maxX) / 2;
  const footprintCenterZ = (footprint.minZ + footprint.maxZ) / 2;

  assetDefinition.connectionPorts?.forEach((port, portIndex) => {
    if (declaredPortIds.has(port.id)) {
      diagnostics.push({
        code: "duplicate-connection-port-id",
        entityId: port.id,
        entityKind: "connection-port",
        message: `Connection Port ID "${port.id}" is declared more than once in Asset Definition "${assetDefinition.assetId}".`,
        path: ["connectionPorts", portIndex, "id"],
        severity: "error",
      });
    } else {
      declaredPortIds.add(port.id);
    }

    const normalLength = Math.hypot(port.normal.x, port.normal.z);

    if (Math.abs(normalLength - 1) > UNIT_VECTOR_TOLERANCE) {
      diagnostics.push({
        code: "non-unit-connection-port-normal",
        entityId: port.id,
        entityKind: "connection-port",
        message: `Connection Port "${port.id}" in Asset Definition "${assetDefinition.assetId}" must have a unit Ground Plane normal.`,
        path: ["connectionPorts", portIndex, "normal"],
        severity: "error",
      });
    }

    const outwardDotProduct =
      (port.position.x - footprintCenterX) * port.normal.x +
      (port.position.z - footprintCenterZ) * port.normal.z;

    if (outwardDotProduct <= 0) {
      diagnostics.push({
        code: "inward-connection-port-normal",
        entityId: port.id,
        entityKind: "connection-port",
        message: `Connection Port "${port.id}" in Asset Definition "${assetDefinition.assetId}" must point away from the Asset Footprint center.`,
        path: ["connectionPorts", portIndex, "normal"],
        severity: "error",
      });
    }
  });

  return diagnostics;
}
