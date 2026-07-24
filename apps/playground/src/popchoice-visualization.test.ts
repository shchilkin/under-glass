import { describe, expect, it } from "vitest";

import { routeBasicConnections } from "@under-glass/core";

import { POPCHOICE_VISUALIZATION } from "./popchoice-visualization.js";

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

const EXPECTED_CONNECTIONS = [
  ["browser", "web", "HTTPS", "oneWay"],
  ["web", "redis", "Enqueue work", "oneWay"],
  ["redis", "workers", "BullMQ jobs", "oneWay"],
  ["workers", "postgres", "Persist results", "oneWay"],
  ["web", "postgres", "SQL + pgvector", "bidirectional"],
  ["workers", "openai-api", "OpenAI inference", "oneWay"],
  ["workers", "tmdb-api", "TMDB metadata", "oneWay"],
  ["backoffice", "postgres", "Admin data", "bidirectional"],
  ["backoffice", "redis", "Enqueue work", "bidirectional"],
  ["bull-board", "redis", "Queue inspection", "oneWay"],
  ["movie-discovery", "tmdb-api", "Discover movies", "oneWay"],
  ["movie-discovery", "openai-api", "Embeddings", "oneWay"],
  ["movie-discovery", "postgres", "Upsert catalog", "oneWay"],
  ["web", "telemetry-stack", "Telemetry", "oneWay"],
  ["workers", "telemetry-stack", "Telemetry", "oneWay"],
  ["backoffice", "telemetry-stack", "Telemetry", "oneWay"],
  ["telemetry-stack", "grafana", "Metrics · logs · traces", "oneWay"],
] as const;

describe("canonical PopChoice Visualization", () => {
  it("contains the agreed production runtime without delivery infrastructure", () => {
    expect(POPCHOICE_VISUALIZATION.nodes.map((node) => node.id).sort()).toEqual(
      EXPECTED_NODE_IDS,
    );
    expect(
      POPCHOICE_VISUALIZATION.nodes.map((node) => node.assetId).sort(),
    ).toHaveLength(12);
    expect(
      new Set(POPCHOICE_VISUALIZATION.nodes.map((node) => node.assetId)).size,
    ).toBeGreaterThanOrEqual(6);
    expect(
      POPCHOICE_VISUALIZATION.nodes.some((node) =>
        /ci|docs|storybook|figma|backfill/i.test(node.label),
      ),
    ).toBe(false);
  });

  it("keeps runtime and data concerns grouped while providers stay external", () => {
    expect(
      POPCHOICE_VISUALIZATION.groups.map(({ id, label }) => ({
        id,
        label,
      })),
    ).toEqual([
      { id: "product-runtime", label: "Product Runtime" },
      { id: "data-observability", label: "Data & Observability" },
    ]);

    const groupByNode = Object.fromEntries(
      POPCHOICE_VISUALIZATION.nodes.map((node) => [
        node.id,
        node.groupId ?? null,
      ]),
    );

    expect(groupByNode).toMatchObject({
      backoffice: "product-runtime",
      browser: null,
      "bull-board": "product-runtime",
      grafana: "data-observability",
      "movie-discovery": "product-runtime",
      "openai-api": null,
      postgres: "data-observability",
      redis: "data-observability",
      "telemetry-stack": "data-observability",
      "tmdb-api": null,
      web: "product-runtime",
      workers: "product-runtime",
    });
  });

  it("makes the primary recommendation flow and supporting integrations explicit", () => {
    expect(
      POPCHOICE_VISUALIZATION.connections.map((connection) => [
        connection.source.nodeId,
        connection.target.nodeId,
        connection.label,
        connection.direction,
      ]),
    ).toEqual(EXPECTED_CONNECTIONS);
    expect(
      POPCHOICE_VISUALIZATION.connections
        .filter((connection) => connection.styleKey === "telemetry")
        .map((connection) => connection.id),
    ).toEqual([
      "web-telemetry",
      "workers-telemetry",
      "backoffice-telemetry",
      "telemetry-grafana",
    ]);
  });

  it("opens on the whole system in an isometric view", () => {
    expect(POPCHOICE_VISUALIZATION.openingView).toEqual({
      cameraMode: "isometric",
      quarterTurns: 1,
      center: { x: -1.5, z: 1.25 },
      groundSpan: 16,
    });
  });

  it("derives deterministic orthogonal routes for every Connection", () => {
    const routes = routeBasicConnections(POPCHOICE_VISUALIZATION, new Map());

    expect(routeBasicConnections(POPCHOICE_VISUALIZATION, new Map())).toEqual(
      routes,
    );
    expect(routes).toHaveLength(EXPECTED_CONNECTIONS.length);

    for (const route of routes) {
      for (let index = 1; index < route.points.length; index += 1) {
        const previous = route.points[index - 1]!;
        const current = route.points[index]!;

        expect(current.x === previous.x || current.z === previous.z).toBe(true);
      }
    }
  });
});
