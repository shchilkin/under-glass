import type { Visualization } from "./visualization.js";

export type DiagnosticSeverity = "error" | "warning";
export type VisualizationDiagnosticCode =
  | "duplicate-id"
  | "invalid-group-bounds"
  | "missing-group"
  | "missing-node"
  | "node-outside-group-bounds";
export type VisualizationEntityKind =
  "connection" | "group" | "node" | "route-anchor";
export type VisualizationDiagnosticPath = readonly (number | string)[];

export interface VisualizationDiagnostic {
  readonly code: VisualizationDiagnosticCode;
  readonly entityId: string;
  readonly entityKind: VisualizationEntityKind;
  readonly message: string;
  readonly path: VisualizationDiagnosticPath;
  readonly severity: DiagnosticSeverity;
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
    if (groupIds.has(group.id)) {
      diagnostics.push({
        code: "duplicate-id",
        entityId: group.id,
        entityKind: "group",
        message: `Group ID "${group.id}" is declared more than once.`,
        path: ["groups", groupIndex, "id"],
        severity: "error",
      });
    } else {
      groupIds.add(group.id);
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
    if (declaredNodeIds.has(node.id)) {
      diagnostics.push({
        code: "duplicate-id",
        entityId: node.id,
        entityKind: "node",
        message: `Node ID "${node.id}" is declared more than once.`,
        path: ["nodes", nodeIndex, "id"],
        severity: "error",
      });
    } else {
      declaredNodeIds.add(node.id);
    }

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
    if (declaredConnectionIds.has(connection.id)) {
      diagnostics.push({
        code: "duplicate-id",
        entityId: connection.id,
        entityKind: "connection",
        message: `Connection ID "${connection.id}" is declared more than once.`,
        path: ["connections", connectionIndex, "id"],
        severity: "error",
      });
    } else {
      declaredConnectionIds.add(connection.id);
    }

    const declaredRouteAnchorIds = new Set<string>();

    connection.routeAnchors.forEach((routeAnchor, routeAnchorIndex) => {
      if (declaredRouteAnchorIds.has(routeAnchor.id)) {
        diagnostics.push({
          code: "duplicate-id",
          entityId: routeAnchor.id,
          entityKind: "route-anchor",
          message: `Route Anchor ID "${routeAnchor.id}" is declared more than once in Connection "${connection.id}".`,
          path: [
            "connections",
            connectionIndex,
            "routeAnchors",
            routeAnchorIndex,
            "id",
          ],
          severity: "error",
        });
      } else {
        declaredRouteAnchorIds.add(routeAnchor.id);
      }
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
