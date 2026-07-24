import type { Connection, Node, Visualization } from "@under-glass/core";

export type AccessibleEntityKind = "connection" | "group" | "node";

export interface AccessibleEntityReference {
  readonly id: string;
  readonly kind: AccessibleEntityKind;
}

export interface ViewerAccessibility {
  readonly resolveEntityLabel: (entity: AccessibleEntityReference) => string;
  readonly sceneLabel: string;
}

export interface SemanticNode {
  readonly id: string;
  readonly label: string;
}

export interface SemanticGroup {
  readonly id: string;
  readonly label: string;
  readonly nodes: readonly SemanticNode[];
}

export interface SemanticConnectionEndpoint {
  readonly id: string;
  readonly label: string;
}

export interface SemanticConnection {
  readonly direction: Connection["direction"];
  readonly id: string;
  readonly label: string;
  readonly source: SemanticConnectionEndpoint;
  readonly target: SemanticConnectionEndpoint;
}

export interface ViewerSemanticGraph {
  readonly connections: readonly SemanticConnection[];
  readonly groups: readonly SemanticGroup[];
  readonly label: string;
  readonly ungroupedNodes: readonly SemanticNode[];
}

function compareById(
  first: { readonly id: string },
  second: { readonly id: string },
): number {
  return first.id.localeCompare(second.id);
}

function resolveLabel(
  accessibility: ViewerAccessibility,
  kind: AccessibleEntityKind,
  id: string,
): string {
  return accessibility.resolveEntityLabel({ id, kind });
}

function semanticNode(
  node: Node,
  accessibility: ViewerAccessibility,
): SemanticNode {
  return {
    id: node.id,
    label: resolveLabel(accessibility, "node", node.id),
  };
}

function semanticConnection(
  connection: Connection,
  accessibility: ViewerAccessibility,
): SemanticConnection {
  return {
    direction: connection.direction,
    id: connection.id,
    label: resolveLabel(accessibility, "connection", connection.id),
    source: {
      id: connection.source.nodeId,
      label: resolveLabel(accessibility, "node", connection.source.nodeId),
    },
    target: {
      id: connection.target.nodeId,
      label: resolveLabel(accessibility, "node", connection.target.nodeId),
    },
  };
}

export function createViewerSemanticGraph(
  visualization: Visualization,
  accessibility: ViewerAccessibility,
): ViewerSemanticGraph {
  const sortedNodes = [...visualization.nodes].sort(compareById);
  const sortedGroups = [...visualization.groups].sort(compareById);
  const groupIds = new Set(sortedGroups.map((group) => group.id));
  const groups = sortedGroups.map((group) => ({
    id: group.id,
    label: resolveLabel(accessibility, "group", group.id),
    nodes: sortedNodes
      .filter((node) => node.groupId === group.id)
      .map((node) => semanticNode(node, accessibility)),
  }));
  const ungroupedNodes = sortedNodes
    .filter((node) => node.groupId === undefined || !groupIds.has(node.groupId))
    .map((node) => semanticNode(node, accessibility));
  const connections = [...visualization.connections]
    .sort(compareById)
    .map((connection) => semanticConnection(connection, accessibility));

  return {
    connections,
    groups,
    label: accessibility.sceneLabel,
    ungroupedNodes,
  };
}
