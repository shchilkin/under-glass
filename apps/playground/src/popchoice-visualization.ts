import {
  parseVisualization,
  type Connection,
  type Group,
  type Node,
  type OpeningView,
  type RouteAnchor,
  type Visualization,
} from "@under-glass/core";

export const POPCHOICE_VIEW_IDS = ["recommendation", "operations"] as const;

export type PopChoiceViewId = (typeof POPCHOICE_VIEW_IDS)[number];

export const DEFAULT_POPCHOICE_VIEW_ID: PopChoiceViewId = "recommendation";

type PopChoiceNodeId =
  | "backoffice"
  | "browser"
  | "bull-board"
  | "grafana"
  | "movie-discovery"
  | "openai-api"
  | "postgres"
  | "redis"
  | "telemetry-stack"
  | "tmdb-api"
  | "web"
  | "workers";

type PopChoiceConnectionId =
  | "backoffice-postgres"
  | "backoffice-redis"
  | "backoffice-telemetry"
  | "browser-web"
  | "bull-board-redis"
  | "movie-discovery-openai"
  | "movie-discovery-postgres"
  | "movie-discovery-tmdb"
  | "redis-workers"
  | "telemetry-grafana"
  | "web-postgres"
  | "web-redis"
  | "web-telemetry"
  | "workers-openai"
  | "workers-postgres"
  | "workers-telemetry"
  | "workers-tmdb";

type NodeTemplate = Omit<Node, "groupId" | "position">;

const NODE_TEMPLATES: Readonly<Record<PopChoiceNodeId, NodeTemplate>> = {
  backoffice: {
    id: "backoffice",
    label: "Backoffice",
    assetId: "dashboard-asset",
    quarterTurns: 0,
  },
  browser: {
    id: "browser",
    label: "Browser",
    assetId: "browser-asset",
    quarterTurns: 0,
  },
  "bull-board": {
    id: "bull-board",
    label: "Bull Board",
    assetId: "dashboard-asset",
    quarterTurns: 0,
  },
  grafana: {
    id: "grafana",
    label: "Grafana",
    assetId: "dashboard-asset",
    quarterTurns: 0,
  },
  "movie-discovery": {
    id: "movie-discovery",
    label: "Movie Discovery",
    assetId: "discovery-asset",
    quarterTurns: 0,
  },
  "openai-api": {
    id: "openai-api",
    label: "OpenAI API",
    assetId: "provider-asset",
    quarterTurns: 0,
  },
  postgres: {
    id: "postgres",
    label: "PostgreSQL · pgvector",
    assetId: "database-asset",
    quarterTurns: 0,
  },
  redis: {
    id: "redis",
    label: "Redis · BullMQ",
    assetId: "queue-asset",
    quarterTurns: 0,
  },
  "telemetry-stack": {
    id: "telemetry-stack",
    label: "Telemetry Stack",
    assetId: "telemetry-asset",
    quarterTurns: 0,
  },
  "tmdb-api": {
    id: "tmdb-api",
    label: "TMDB API",
    assetId: "provider-asset",
    quarterTurns: 0,
  },
  web: {
    id: "web",
    label: "Web",
    assetId: "service-asset",
    quarterTurns: 1,
  },
  workers: {
    id: "workers",
    label: "Workers",
    assetId: "worker-asset",
    quarterTurns: 0,
  },
};

const CONNECTION_TEMPLATES: Readonly<
  Record<PopChoiceConnectionId, Connection>
> = {
  "browser-web": {
    id: "browser-web",
    label: "HTTPS",
    source: { nodeId: "browser" },
    target: { nodeId: "web" },
    direction: "oneWay",
    routeAnchors: [],
    styleKey: "primary",
  },
  "web-redis": {
    id: "web-redis",
    label: "Enqueue",
    source: { nodeId: "web" },
    target: { nodeId: "redis" },
    direction: "oneWay",
    routeAnchors: [],
    styleKey: "primary",
  },
  "redis-workers": {
    id: "redis-workers",
    label: "Jobs",
    source: { nodeId: "redis" },
    target: { nodeId: "workers" },
    direction: "oneWay",
    routeAnchors: [],
    styleKey: "primary",
  },
  "workers-postgres": {
    id: "workers-postgres",
    label: "Persist",
    source: { nodeId: "workers" },
    target: { nodeId: "postgres" },
    direction: "oneWay",
    routeAnchors: [],
    styleKey: "primary",
  },
  "web-postgres": {
    id: "web-postgres",
    label: "Query · results",
    source: { nodeId: "web" },
    target: { nodeId: "postgres" },
    direction: "bidirectional",
    routeAnchors: [],
    styleKey: "primary",
  },
  "workers-openai": {
    id: "workers-openai",
    label: "Inference",
    source: { nodeId: "workers" },
    target: { nodeId: "openai-api" },
    direction: "oneWay",
    routeAnchors: [],
    styleKey: "supporting",
  },
  "workers-tmdb": {
    id: "workers-tmdb",
    label: "Metadata",
    source: { nodeId: "workers" },
    target: { nodeId: "tmdb-api" },
    direction: "oneWay",
    routeAnchors: [],
    styleKey: "supporting",
  },
  "backoffice-postgres": {
    id: "backoffice-postgres",
    label: "Admin data",
    source: { nodeId: "backoffice" },
    target: { nodeId: "postgres" },
    direction: "bidirectional",
    routeAnchors: [],
    styleKey: "supporting",
  },
  "backoffice-redis": {
    id: "backoffice-redis",
    label: "Admin queue",
    source: { nodeId: "backoffice" },
    target: { nodeId: "redis" },
    direction: "bidirectional",
    routeAnchors: [],
    styleKey: "supporting",
  },
  "bull-board-redis": {
    id: "bull-board-redis",
    label: "Queue state",
    source: { nodeId: "bull-board" },
    target: { nodeId: "redis" },
    direction: "oneWay",
    routeAnchors: [],
    styleKey: "supporting",
  },
  "movie-discovery-tmdb": {
    id: "movie-discovery-tmdb",
    label: "Metadata",
    source: { nodeId: "movie-discovery" },
    target: { nodeId: "tmdb-api" },
    direction: "oneWay",
    routeAnchors: [],
    styleKey: "supporting",
  },
  "movie-discovery-openai": {
    id: "movie-discovery-openai",
    label: "Embeddings",
    source: { nodeId: "movie-discovery" },
    target: { nodeId: "openai-api" },
    direction: "oneWay",
    routeAnchors: [],
    styleKey: "supporting",
  },
  "movie-discovery-postgres": {
    id: "movie-discovery-postgres",
    label: "Catalog",
    source: { nodeId: "movie-discovery" },
    target: { nodeId: "postgres" },
    direction: "oneWay",
    routeAnchors: [],
    styleKey: "supporting",
  },
  "web-telemetry": {
    id: "web-telemetry",
    label: "Telemetry",
    source: { nodeId: "web" },
    target: { nodeId: "telemetry-stack" },
    direction: "oneWay",
    routeAnchors: [],
    styleKey: "telemetry",
  },
  "workers-telemetry": {
    id: "workers-telemetry",
    label: "Telemetry",
    source: { nodeId: "workers" },
    target: { nodeId: "telemetry-stack" },
    direction: "oneWay",
    routeAnchors: [],
    styleKey: "telemetry",
  },
  "backoffice-telemetry": {
    id: "backoffice-telemetry",
    label: "Telemetry",
    source: { nodeId: "backoffice" },
    target: { nodeId: "telemetry-stack" },
    direction: "oneWay",
    routeAnchors: [],
    styleKey: "telemetry",
  },
  "telemetry-grafana": {
    id: "telemetry-grafana",
    label: "Signals",
    source: { nodeId: "telemetry-stack" },
    target: { nodeId: "grafana" },
    direction: "oneWay",
    routeAnchors: [],
    styleKey: "telemetry",
  },
};

interface NodePlacement {
  readonly groupId?: string;
  readonly id: PopChoiceNodeId;
  readonly position: Node["position"];
}

interface ConnectionProjection {
  readonly id: PopChoiceConnectionId;
  readonly label?: string;
  readonly routeAnchors?: readonly RouteAnchor[];
  readonly styleKey?: string;
}

interface PopChoiceViewSpec {
  readonly connections: readonly ConnectionProjection[];
  readonly description: string;
  readonly groups: readonly Group[];
  readonly id: PopChoiceViewId;
  readonly label: string;
  readonly nodes: readonly NodePlacement[];
  readonly openingView: OpeningView;
}

function projectNode(placement: NodePlacement): Node {
  return {
    ...NODE_TEMPLATES[placement.id],
    ...(placement.groupId === undefined ? {} : { groupId: placement.groupId }),
    position: placement.position,
  };
}

function projectConnection(projection: ConnectionProjection): Connection {
  const template = CONNECTION_TEMPLATES[projection.id];

  return {
    ...template,
    ...(projection.label === undefined ? {} : { label: projection.label }),
    ...(projection.routeAnchors === undefined
      ? {}
      : { routeAnchors: [...projection.routeAnchors] }),
    ...(projection.styleKey === undefined
      ? {}
      : { styleKey: projection.styleKey }),
  };
}

function projectVisualization(spec: PopChoiceViewSpec): Visualization {
  return parseVisualization({
    schemaVersion: 1,
    nodes: spec.nodes.map(projectNode),
    groups: spec.groups,
    connections: spec.connections.map(projectConnection),
    openingView: spec.openingView,
  });
}

const RECOMMENDATION_VIEW: PopChoiceViewSpec = {
  id: "recommendation",
  label: "Recommendation",
  description: "Request → recommendation result",
  nodes: [
    { id: "browser", position: { x: -9.5, z: 0 } },
    {
      id: "web",
      groupId: "recommendation-runtime",
      position: { x: -6, z: 0 },
    },
    {
      id: "redis",
      groupId: "recommendation-runtime",
      position: { x: -2.5, z: 0 },
    },
    {
      id: "workers",
      groupId: "recommendation-runtime",
      position: { x: 1, z: 0 },
    },
    {
      id: "postgres",
      groupId: "recommendation-data",
      position: { x: 6, z: 0 },
    },
    {
      id: "openai-api",
      groupId: "recommendation-providers",
      position: { x: 1, z: 5 },
    },
    {
      id: "tmdb-api",
      groupId: "recommendation-providers",
      position: { x: 6, z: 5 },
    },
  ],
  groups: [
    {
      id: "recommendation-runtime",
      label: "Recommendation Runtime",
      bounds: { minX: -7.5, minZ: -3.6, maxX: 2.5, maxZ: 1.6 },
      styleKey: "runtime",
    },
    {
      id: "recommendation-data",
      label: "Data",
      bounds: { minX: 4.3, minZ: -3.6, maxX: 7.7, maxZ: 1.6 },
      styleKey: "data",
    },
    {
      id: "recommendation-providers",
      label: "AI & Content Providers",
      bounds: { minX: -0.5, minZ: 3.1, maxX: 7.7, maxZ: 6.8 },
      styleKey: "external",
    },
  ],
  connections: [
    { id: "browser-web" },
    { id: "web-redis" },
    { id: "redis-workers" },
    { id: "workers-postgres" },
    {
      id: "web-postgres",
      routeAnchors: [
        { id: "query-lane-start", position: { x: -6, z: -2 } },
        { id: "query-lane-end", position: { x: 6, z: -2 } },
      ],
    },
    { id: "workers-openai" },
    {
      id: "workers-tmdb",
      routeAnchors: [
        { id: "metadata-lane-start", position: { x: 1, z: 2.35 } },
        { id: "metadata-lane-end", position: { x: 6, z: 2.35 } },
      ],
    },
  ],
  openingView: {
    cameraMode: "isometric",
    quarterTurns: 0,
    center: { x: -0.8, z: 1.5 },
    groundSpan: 12.5,
  },
};

const OPERATIONS_VIEW: PopChoiceViewSpec = {
  id: "operations",
  label: "Operations",
  description: "Admin, background work & observability",
  nodes: [
    {
      id: "backoffice",
      groupId: "operations-tools",
      position: { x: -8, z: -3.5 },
    },
    {
      id: "bull-board",
      groupId: "operations-tools",
      position: { x: -8, z: 0 },
    },
    {
      id: "movie-discovery",
      groupId: "operations-tools",
      position: { x: -8, z: 3.5 },
    },
    {
      id: "redis",
      groupId: "operations-platform",
      position: { x: -2, z: 0 },
    },
    {
      id: "postgres",
      groupId: "operations-platform",
      position: { x: 2, z: 0 },
    },
    {
      id: "openai-api",
      groupId: "operations-external",
      position: { x: 7.5, z: -2 },
    },
    {
      id: "tmdb-api",
      groupId: "operations-external",
      position: { x: 7.5, z: 2 },
    },
    {
      id: "web",
      groupId: "operations-signals",
      position: { x: -2, z: 6.5 },
    },
    {
      id: "workers",
      groupId: "operations-signals",
      position: { x: 2, z: 6.5 },
    },
    {
      id: "telemetry-stack",
      groupId: "operations-observability",
      position: { x: 6.5, z: 6.5 },
    },
    {
      id: "grafana",
      groupId: "operations-observability",
      position: { x: 10.5, z: 6.5 },
    },
  ],
  groups: [
    {
      id: "operations-tools",
      label: "Operations",
      bounds: { minX: -10, minZ: -5.5, maxX: -6, maxZ: 5 },
      styleKey: "operations",
    },
    {
      id: "operations-platform",
      label: "Platform Data",
      bounds: { minX: -3.5, minZ: -2.7, maxX: 3.5, maxZ: 2 },
      styleKey: "data",
    },
    {
      id: "operations-external",
      label: "Providers",
      bounds: { minX: 5.5, minZ: -4, maxX: 9.5, maxZ: 3.2 },
      styleKey: "external",
    },
    {
      id: "operations-signals",
      label: "Runtime Signals",
      bounds: { minX: -3.5, minZ: 3.5, maxX: 3.5, maxZ: 8.2 },
      styleKey: "runtime",
    },
    {
      id: "operations-observability",
      label: "Observability",
      bounds: { minX: 5, minZ: 4.7, maxX: 12, maxZ: 8.2 },
      styleKey: "observability",
    },
  ],
  connections: [
    { id: "backoffice-postgres" },
    { id: "backoffice-redis", label: "" },
    { id: "bull-board-redis" },
    { id: "movie-discovery-tmdb" },
    { id: "movie-discovery-openai" },
    { id: "movie-discovery-postgres" },
    { id: "web-telemetry", label: "" },
    { id: "workers-telemetry", label: "" },
    { id: "backoffice-telemetry", label: "" },
    { id: "telemetry-grafana" },
  ],
  openingView: {
    cameraMode: "isometric",
    quarterTurns: 0,
    center: { x: 1, z: 1.3 },
    groundSpan: 15.5,
  },
};

interface PopChoiceView {
  readonly description: string;
  readonly id: PopChoiceViewId;
  readonly label: string;
  readonly visualization: Visualization;
}

export const POPCHOICE_VIEWS = {
  recommendation: {
    description: RECOMMENDATION_VIEW.description,
    id: RECOMMENDATION_VIEW.id,
    label: RECOMMENDATION_VIEW.label,
    visualization: projectVisualization(RECOMMENDATION_VIEW),
  },
  operations: {
    description: OPERATIONS_VIEW.description,
    id: OPERATIONS_VIEW.id,
    label: OPERATIONS_VIEW.label,
    visualization: projectVisualization(OPERATIONS_VIEW),
  },
} satisfies Readonly<Record<PopChoiceViewId, PopChoiceView>>;
