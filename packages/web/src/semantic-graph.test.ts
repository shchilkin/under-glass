import { describe, expect, it } from "vitest";

import type { Visualization } from "@under-glass/core";

import {
  createViewerSemanticGraph,
  type ViewerAccessibility,
} from "./semantic-graph.js";

const VISUALIZATION = {
  schemaVersion: 1,
  nodes: [
    {
      id: "node-c",
      label: "Persisted C",
      assetId: "asset",
      groupId: "group-runtime",
      position: { x: 2, z: 0 },
      quarterTurns: 0,
    },
    {
      id: "node-a",
      label: "Persisted A",
      assetId: "asset",
      position: { x: -2, z: 0 },
      quarterTurns: 0,
    },
    {
      id: "node-b",
      label: "Persisted B",
      assetId: "asset",
      groupId: "group-runtime",
      position: { x: 0, z: 0 },
      quarterTurns: 0,
    },
  ],
  groups: [
    {
      id: "group-runtime",
      label: "Persisted group",
      bounds: { minX: -1, minZ: -1, maxX: 3, maxZ: 1 },
    },
  ],
  connections: [
    {
      id: "connection-undirected",
      label: "Persisted undirected",
      source: { nodeId: "node-c" },
      target: { nodeId: "node-a" },
      direction: "undirected",
      routeAnchors: [],
    },
    {
      id: "connection-one-way",
      label: "Persisted one way",
      source: { nodeId: "node-a" },
      target: { nodeId: "node-b" },
      direction: "oneWay",
      routeAnchors: [],
    },
    {
      id: "connection-bidirectional",
      label: "Persisted bidirectional",
      source: { nodeId: "node-b" },
      target: { nodeId: "node-c" },
      direction: "bidirectional",
      routeAnchors: [],
    },
  ],
  openingView: {
    cameraMode: "isometric",
    quarterTurns: 0,
    center: { x: 0, z: 0 },
    groundSpan: 12,
  },
} satisfies Visualization;

const ACCESSIBLE_LABELS: Readonly<Record<string, string>> = {
  "connection:connection-bidirectional": "Queue synchronization",
  "connection:connection-one-way": "Request dispatch",
  "connection:connection-undirected": "Peer link",
  "group:group-runtime": "Application runtime",
  "node:node-a": "Public browser",
  "node:node-b": "Web service",
  "node:node-c": "Job worker",
};

const ACCESSIBILITY: ViewerAccessibility = {
  resolveEntityLabel: ({ id, kind }) => ACCESSIBLE_LABELS[`${kind}:${id}`]!,
  sceneLabel: "PopChoice recommendation architecture",
};

describe("createViewerSemanticGraph", () => {
  it("builds a deterministic graph from host-resolved accessible labels", () => {
    expect(createViewerSemanticGraph(VISUALIZATION, ACCESSIBILITY)).toEqual({
      connections: [
        {
          direction: "bidirectional",
          id: "connection-bidirectional",
          label: "Queue synchronization",
          source: { id: "node-b", label: "Web service" },
          target: { id: "node-c", label: "Job worker" },
        },
        {
          direction: "oneWay",
          id: "connection-one-way",
          label: "Request dispatch",
          source: { id: "node-a", label: "Public browser" },
          target: { id: "node-b", label: "Web service" },
        },
        {
          direction: "undirected",
          id: "connection-undirected",
          label: "Peer link",
          source: { id: "node-c", label: "Job worker" },
          target: { id: "node-a", label: "Public browser" },
        },
      ],
      groups: [
        {
          id: "group-runtime",
          label: "Application runtime",
          nodes: [
            { id: "node-b", label: "Web service" },
            { id: "node-c", label: "Job worker" },
          ],
        },
      ],
      label: "PopChoice recommendation architecture",
      ungroupedNodes: [{ id: "node-a", label: "Public browser" }],
    });
  });

  it("does not derive accessible copy from persisted labels", () => {
    const renamedVisualization = {
      ...VISUALIZATION,
      nodes: VISUALIZATION.nodes.map((node) => ({
        ...node,
        label: `Changed ${node.id}`,
      })),
      groups: VISUALIZATION.groups.map((group) => ({
        ...group,
        label: `Changed ${group.id}`,
      })),
      connections: VISUALIZATION.connections.map((connection) => ({
        ...connection,
        label: `Changed ${connection.id}`,
      })),
    } satisfies Visualization;

    expect(
      createViewerSemanticGraph(renamedVisualization, ACCESSIBILITY),
    ).toEqual(createViewerSemanticGraph(VISUALIZATION, ACCESSIBILITY));
  });

  it("keeps orphaned Nodes and dangling Connection endpoints discoverable", () => {
    const invalidVisualization = {
      ...VISUALIZATION,
      nodes: VISUALIZATION.nodes.map((node) =>
        node.id === "node-a" ? { ...node, groupId: "missing-group" } : node,
      ),
      connections: VISUALIZATION.connections.map((connection) =>
        connection.id === "connection-one-way"
          ? { ...connection, target: { nodeId: "missing-node" } }
          : connection,
      ),
    } satisfies Visualization;
    const permissiveAccessibility: ViewerAccessibility = {
      resolveEntityLabel: ({ id, kind }) => `${kind}:${id}`,
      sceneLabel: "Invalid but discoverable architecture",
    };
    const graph = createViewerSemanticGraph(
      invalidVisualization,
      permissiveAccessibility,
    );

    expect(graph.ungroupedNodes).toContainEqual({
      id: "node-a",
      label: "node:node-a",
    });
    expect(
      graph.connections.find(
        (connection) => connection.id === "connection-one-way",
      )?.target,
    ).toEqual({
      id: "missing-node",
      label: "node:missing-node",
    });
  });
});
