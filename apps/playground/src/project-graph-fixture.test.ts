import { describe, expect, it } from "vitest";

import { PROJECT_GRAPH_VISUALIZATION } from "./project-graph-fixture.js";

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
  ["browser", "web", "HTTPS"],
  ["web", "redis", "Enqueue work"],
  ["redis", "workers", "BullMQ jobs"],
  ["workers", "postgres", "Persist results"],
  ["web", "postgres", "SQL + pgvector"],
  ["workers", "openai-api", "OpenAI inference"],
  ["workers", "tmdb-api", "TMDB metadata"],
  ["backoffice", "postgres", "Admin data"],
  ["backoffice", "redis", "Enqueue work"],
  ["bull-board", "redis", "Queue inspection"],
  ["movie-discovery", "tmdb-api", "Discover movies"],
  ["movie-discovery", "openai-api", "Embeddings"],
  ["movie-discovery", "postgres", "Upsert catalog"],
  ["web", "telemetry-stack", "Telemetry"],
  ["workers", "telemetry-stack", "Telemetry"],
  ["backoffice", "telemetry-stack", "Telemetry"],
  ["telemetry-stack", "grafana", "Metrics · logs · traces"],
] as const;

describe("canonical PopChoice Visualization", () => {
  it("contains the agreed production runtime without delivery infrastructure", () => {
    expect(
      PROJECT_GRAPH_VISUALIZATION.nodes.map((node) => node.id).sort(),
    ).toEqual(EXPECTED_NODE_IDS);
    expect(
      PROJECT_GRAPH_VISUALIZATION.nodes.map((node) => node.assetId).sort(),
    ).toHaveLength(12);
    expect(
      new Set(PROJECT_GRAPH_VISUALIZATION.nodes.map((node) => node.assetId))
        .size,
    ).toBeGreaterThanOrEqual(6);
    expect(
      PROJECT_GRAPH_VISUALIZATION.nodes.some((node) =>
        /ci|docs|storybook|figma|backfill/i.test(node.label),
      ),
    ).toBe(false);
  });

  it("keeps runtime and data concerns grouped while providers stay external", () => {
    expect(
      PROJECT_GRAPH_VISUALIZATION.groups.map(({ id, label }) => ({
        id,
        label,
      })),
    ).toEqual([
      { id: "product-runtime", label: "Product Runtime" },
      { id: "data-observability", label: "Data & Observability" },
    ]);

    const groupByNode = Object.fromEntries(
      PROJECT_GRAPH_VISUALIZATION.nodes.map((node) => [
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
      PROJECT_GRAPH_VISUALIZATION.connections.map((connection) => [
        connection.source.nodeId,
        connection.target.nodeId,
        connection.label,
      ]),
    ).toEqual(EXPECTED_CONNECTIONS);
    expect(
      PROJECT_GRAPH_VISUALIZATION.connections
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
    expect(PROJECT_GRAPH_VISUALIZATION.openingView).toEqual({
      cameraMode: "isometric",
      quarterTurns: 1,
      center: { x: -1.5, z: 1.25 },
      groundSpan: 16,
    });
  });
});
