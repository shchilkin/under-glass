import type { Visualization } from "./visualization.js";
import type { DiagnosticPath, DiagnosticSeverity } from "./diagnostics.js";

export type VisualizationDiagnosticCode =
  | "duplicate-id"
  | "invalid-group-bounds"
  | "missing-group"
  | "missing-node"
  | "node-outside-group-bounds";
export type VisualizationEntityKind =
  "connection" | "group" | "node" | "route-anchor";
export type VisualizationDiagnosticPath = DiagnosticPath;

export interface VisualizationDiagnostic {
  readonly code: VisualizationDiagnosticCode;
  readonly entityId: string;
  readonly entityKind: VisualizationEntityKind;
  readonly message: string;
  readonly path: VisualizationDiagnosticPath;
  readonly severity: DiagnosticSeverity;
}

function reportDuplicateId(
  diagnostics: VisualizationDiagnostic[],
  declaredIds: Set<string>,
  entityId: string,
  entityKind: VisualizationEntityKind,
  message: string,
  path: VisualizationDiagnosticPath,
): void {
  if (!declaredIds.has(entityId)) {
    declaredIds.add(entityId);
    return;
  }

  diagnostics.push({
    code: "duplicate-id",
    entityId,
    entityKind,
    message,
    path,
    severity: "error",
  });
}

export function validateVisualizationSemantics(
  visualization: Visualization,
): VisualizationDiagnostic[] {
  const diagnostics: VisualizationDiagnostic[] = [];
  const groupIds = new Set<string>();
  const groupsById = new Map<string, Visualization["groups"][number]>();
  const nodeIds = new Set(visualization.nodes.map((node) => node.id));
  const declaredNodeIds = new Set<string>();
  const declaredConnectionIds = new Set<string>();

  visualization.groups.forEach((group, groupIndex) => {
    const isFirstDeclaration = !groupIds.has(group.id);

    reportDuplicateId(
      diagnostics,
      groupIds,
      group.id,
      "group",
      `Group ID "${group.id}" is declared more than once.`,
      ["groups", groupIndex, "id"],
    );

    if (isFirstDeclaration) {
      groupsById.set(group.id, group);
    }

    if (
      group.bounds.minX >= group.bounds.maxX ||
      group.bounds.minZ >= group.bounds.maxZ
    ) {
      diagnostics.push({
        code: "invalid-group-bounds",
        entityId: group.id,
        entityKind: "group",
        message: `Group "${group.id}" bounds must have positive width and depth.`,
        path: ["groups", groupIndex, "bounds"],
        severity: "error",
      });
    }
  });

  visualization.nodes.forEach((node, nodeIndex) => {
    reportDuplicateId(
      diagnostics,
      declaredNodeIds,
      node.id,
      "node",
      `Node ID "${node.id}" is declared more than once.`,
      ["nodes", nodeIndex, "id"],
    );

    if (node.groupId !== undefined && !groupIds.has(node.groupId)) {
      diagnostics.push({
        code: "missing-group",
        entityId: node.id,
        entityKind: "node",
        message: `Node "${node.id}" references missing Group "${node.groupId}".`,
        path: ["nodes", nodeIndex, "groupId"],
        severity: "error",
      });
    } else if (node.groupId !== undefined) {
      const group = groupsById.get(node.groupId);

      if (
        group !== undefined &&
        (node.position.x < group.bounds.minX ||
          node.position.x > group.bounds.maxX ||
          node.position.z < group.bounds.minZ ||
          node.position.z > group.bounds.maxZ)
      ) {
        diagnostics.push({
          code: "node-outside-group-bounds",
          entityId: node.id,
          entityKind: "node",
          message: `Node "${node.id}" is outside Group "${node.groupId}" bounds.`,
          path: ["nodes", nodeIndex, "position"],
          severity: "warning",
        });
      }
    }
  });

  visualization.connections.forEach((connection, connectionIndex) => {
    reportDuplicateId(
      diagnostics,
      declaredConnectionIds,
      connection.id,
      "connection",
      `Connection ID "${connection.id}" is declared more than once.`,
      ["connections", connectionIndex, "id"],
    );

    const declaredRouteAnchorIds = new Set<string>();

    connection.routeAnchors.forEach((routeAnchor, routeAnchorIndex) => {
      reportDuplicateId(
        diagnostics,
        declaredRouteAnchorIds,
        routeAnchor.id,
        "route-anchor",
        `Route Anchor ID "${routeAnchor.id}" is declared more than once in Connection "${connection.id}".`,
        [
          "connections",
          connectionIndex,
          "routeAnchors",
          routeAnchorIndex,
          "id",
        ],
      );
    });

    for (const endpointName of ["source", "target"] as const) {
      const nodeId = connection[endpointName].nodeId;

      if (!nodeIds.has(nodeId)) {
        diagnostics.push({
          code: "missing-node",
          entityId: connection.id,
          entityKind: "connection",
          message: `Connection "${connection.id}" references missing Node "${nodeId}".`,
          path: ["connections", connectionIndex, endpointName, "nodeId"],
          severity: "error",
        });
      }
    }
  });

  return diagnostics;
}
