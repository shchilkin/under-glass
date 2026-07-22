import type { Visualization } from "./visualization.js";

export type VisualizationDiagnosticCode = "missing-group" | "missing-node";
export type VisualizationEntityKind = "connection" | "node";
export type VisualizationDiagnosticPath = readonly (number | string)[];

export interface VisualizationDiagnostic {
  readonly code: VisualizationDiagnosticCode;
  readonly entityId: string;
  readonly entityKind: VisualizationEntityKind;
  readonly message: string;
  readonly path: VisualizationDiagnosticPath;
}

export function validateVisualizationSemantics(
  visualization: Visualization,
): VisualizationDiagnostic[] {
  const diagnostics: VisualizationDiagnostic[] = [];
  const groupIds = new Set(visualization.groups.map((group) => group.id));
  const nodeIds = new Set(visualization.nodes.map((node) => node.id));

  visualization.nodes.forEach((node, nodeIndex) => {
    if (node.groupId !== undefined && !groupIds.has(node.groupId)) {
      diagnostics.push({
        code: "missing-group",
        entityId: node.id,
        entityKind: "node",
        message: `Node "${node.id}" references missing Group "${node.groupId}".`,
        path: ["nodes", nodeIndex, "groupId"],
      });
    }
  });

  visualization.connections.forEach((connection, connectionIndex) => {
    for (const endpointName of ["source", "target"] as const) {
      const nodeId = connection[endpointName].nodeId;

      if (!nodeIds.has(nodeId)) {
        diagnostics.push({
          code: "missing-node",
          entityId: connection.id,
          entityKind: "connection",
          message: `Connection "${connection.id}" references missing Node "${nodeId}".`,
          path: ["connections", connectionIndex, endpointName, "nodeId"],
        });
      }
    }
  });

  return diagnostics;
}
