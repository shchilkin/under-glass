import { describe, expect, it } from "vitest";

import { routeBasicConnections, type Visualization } from "@under-glass/core";

import {
  DEFAULT_POPCHOICE_VIEW_ID,
  POPCHOICE_VIEW_IDS,
  POPCHOICE_VIEWS,
} from "./popchoice-visualization.js";

const EXPECTED_NODE_IDS = [
  "backoffice",
  "browser",
  "bull-board",
  "grafana",
  "movie-discovery",
  "openai-api",
  "postgres",
  "redis",
  "telemetry-stack",
  "tmdb-api",
  "web",
  "workers",
] as const;

const EXPECTED_CONNECTION_IDS = [
  "backoffice-postgres",
  "backoffice-redis",
  "backoffice-telemetry",
  "browser-web",
  "bull-board-redis",
  "movie-discovery-openai",
  "movie-discovery-postgres",
  "movie-discovery-tmdb",
  "redis-workers",
  "telemetry-grafana",
  "web-postgres",
  "web-redis",
  "web-telemetry",
  "workers-openai",
  "workers-postgres",
  "workers-telemetry",
  "workers-tmdb",
] as const;

function expectValidProjection(visualization: Visualization): void {
  const nodeIds = new Set(visualization.nodes.map((node) => node.id));
  const groupsById = new Map(
    visualization.groups.map((group) => [group.id, group] as const),
  );

  for (const node of visualization.nodes) {
    if (node.groupId === undefined) {
      continue;
    }

    const group = groupsById.get(node.groupId);
    expect(group).toBeDefined();
    expect(node.position.x).toBeGreaterThanOrEqual(group!.bounds.minX);
    expect(node.position.x).toBeLessThanOrEqual(group!.bounds.maxX);
    expect(node.position.z).toBeGreaterThanOrEqual(group!.bounds.minZ);
    expect(node.position.z).toBeLessThanOrEqual(group!.bounds.maxZ);
  }

  for (const connection of visualization.connections) {
    expect(nodeIds.has(connection.source.nodeId)).toBe(true);
    expect(nodeIds.has(connection.target.nodeId)).toBe(true);
  }
}

function groundGap(
  first: Visualization["groups"][number],
  second: Visualization["groups"][number],
): number {
  const xGap = Math.max(
    0,
    second.bounds.minX - first.bounds.maxX,
    first.bounds.minX - second.bounds.maxX,
  );
  const zGap = Math.max(
    0,
    second.bounds.minZ - first.bounds.maxZ,
    first.bounds.minZ - second.bounds.maxZ,
  );
  return Math.max(xGap, zGap);
}

describe("PopChoice preset views", () => {
  it("projects one runtime model into two purpose-specific Visualizations", () => {
    expect(DEFAULT_POPCHOICE_VIEW_ID).toBe("recommendation");
    expect(POPCHOICE_VIEW_IDS).toEqual(["recommendation", "operations"]);

    const projectedNodeIds = new Set(
      POPCHOICE_VIEW_IDS.flatMap((id) =>
        POPCHOICE_VIEWS[id].visualization.nodes.map((node) => node.id),
      ),
    );
    const projectedConnectionIds = new Set(
      POPCHOICE_VIEW_IDS.flatMap((id) =>
        POPCHOICE_VIEWS[id].visualization.connections.map(
          (connection) => connection.id,
        ),
      ),
    );

    expect([...projectedNodeIds].sort()).toEqual(EXPECTED_NODE_IDS);
    expect([...projectedConnectionIds].sort()).toEqual(EXPECTED_CONNECTION_IDS);
  });

  it("keeps the recommendation view focused on one request-to-result story", () => {
    const view = POPCHOICE_VIEWS.recommendation;
    const visualization = view.visualization;

    expect(view.label).toBe("Recommendation");
    expect(visualization.nodes.map((node) => node.id)).toEqual([
      "browser",
      "web",
      "redis",
      "workers",
      "postgres",
      "openai-api",
      "tmdb-api",
    ]);
    expect(
      visualization.connections.map((connection) => connection.id),
    ).toEqual([
      "browser-web",
      "web-redis",
      "redis-workers",
      "workers-postgres",
      "web-postgres",
      "workers-openai",
      "workers-tmdb",
    ]);
    expect(visualization.groups.map((group) => group.label)).toEqual([
      "Recommendation Runtime",
      "Data",
      "AI & Content Providers",
    ]);
    expect(visualization.openingView).toEqual({
      cameraMode: "isometric",
      quarterTurns: 0,
      center: { x: -0.8, z: 1.5 },
      groundSpan: 12.5,
    });
  });

  it("separates operational tools, providers, and observability into zones", () => {
    const visualization = POPCHOICE_VIEWS.operations.visualization;

    expect(visualization.nodes).toHaveLength(11);
    expect(visualization.connections).toHaveLength(10);
    expect(visualization.groups.map((group) => group.label)).toEqual([
      "Operations",
      "Platform Data",
      "Providers",
      "Runtime Signals",
      "Observability",
    ]);
    expect(
      visualization.connections
        .filter((connection) => connection.label.length > 0)
        .map((connection) => connection.label),
    ).toEqual([
      "Admin data",
      "Queue state",
      "Metadata",
      "Embeddings",
      "Catalog",
      "Signals",
    ]);
  });

  it("keeps every projection self-contained and spatially valid", () => {
    for (const id of POPCHOICE_VIEW_IDS) {
      expectValidProjection(POPCHOICE_VIEWS[id].visualization);
    }
  });

  it("keeps authored padding inside Groups and visible gutters between them", () => {
    for (const id of POPCHOICE_VIEW_IDS) {
      const visualization = POPCHOICE_VIEWS[id].visualization;
      const groupsById = new Map(
        visualization.groups.map((group) => [group.id, group] as const),
      );

      for (const node of visualization.nodes) {
        if (node.groupId === undefined) {
          continue;
        }

        const bounds = groupsById.get(node.groupId)!.bounds;
        expect(node.position.x - bounds.minX).toBeGreaterThanOrEqual(1);
        expect(bounds.maxX - node.position.x).toBeGreaterThanOrEqual(1);
        expect(node.position.z - bounds.minZ).toBeGreaterThanOrEqual(1);
        expect(bounds.maxZ - node.position.z).toBeGreaterThanOrEqual(1);
      }

      for (
        let firstIndex = 0;
        firstIndex < visualization.groups.length;
        firstIndex += 1
      ) {
        for (
          let secondIndex = firstIndex + 1;
          secondIndex < visualization.groups.length;
          secondIndex += 1
        ) {
          expect(
            groundGap(
              visualization.groups[firstIndex]!,
              visualization.groups[secondIndex]!,
            ),
          ).toBeGreaterThanOrEqual(1.5);
        }
      }
    }
  });

  it("derives deterministic orthogonal routes for both views", () => {
    for (const id of POPCHOICE_VIEW_IDS) {
      const visualization = POPCHOICE_VIEWS[id].visualization;
      const routes = routeBasicConnections(visualization, new Map());

      expect(routeBasicConnections(visualization, new Map())).toEqual(routes);
      expect(routes).toHaveLength(visualization.connections.length);

      for (const route of routes) {
        for (let index = 1; index < route.points.length; index += 1) {
          const previous = route.points[index - 1]!;
          const current = route.points[index]!;

          expect(current.x === previous.x || current.z === previous.z).toBe(
            true,
          );
        }
      }
    }
  });
});
