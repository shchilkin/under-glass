import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  parseVisualization,
  type Node,
  type OpeningView,
  type Visualization,
} from "@under-glass/core";
import {
  createSceneRenderer,
  type CameraMotion,
  type ResolvedAsset,
  type SceneRenderer,
  type SceneRendererSnapshot,
  type SceneRendererStatus,
} from "@under-glass/three";

import { markDemoGlbAsCompressed, resolveDemoAsset } from "./demo-asset.js";
import { PROJECT_GRAPH_VISUALIZATION } from "./project-graph-fixture.js";
import "./styles.css";

const searchParameters = new URLSearchParams(window.location.search);
const showConnection = searchParameters.has("connections");
const scenario = searchParameters.get("scenario") ?? "single";
const CAMERA_MOTIONS: readonly CameraMotion[] = ["responsive", "spring"];
const requestedCameraMotion = searchParameters.get("motion");
const initialCameraMotion: CameraMotion =
  requestedCameraMotion !== null &&
  CAMERA_MOTIONS.includes(requestedCameraMotion as CameraMotion)
    ? (requestedCameraMotion as CameraMotion)
    : "responsive";

if (
  requestedCameraMotion !== null &&
  requestedCameraMotion !== initialCameraMotion
) {
  searchParameters.set("motion", initialCameraMotion);
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}?${searchParameters.toString()}${window.location.hash}`,
  );
}

const CAMERA_MOTION_COPY: Readonly<
  Record<CameraMotion, { readonly description: string; readonly label: string }>
> = {
  responsive: {
    description: "440 ms · strong ease-out",
    label: "Responsive",
  },
  spring: {
    description: "650 ms · 3.5% overshoot",
    label: "Spring",
  },
};

function recoverableScenarioNodes(failure: string): Node[] {
  return [
    {
      id: "healthy-node",
      label: "Healthy Node",
      assetId: "demo-system",
      position: { x: -1.5, z: 0 },
      quarterTurns: 0,
    },
    {
      id: `${failure}-node`,
      label: `${failure} Node`,
      assetId: `${failure}-system`,
      position: { x: 1.5, z: 0 },
      quarterTurns: 0,
    },
  ];
}

const SINGLE_NODE: Node[] = [
  {
    id: "demo-node",
    label: "Demo system",
    assetId: "demo-system",
    position: { x: 0, z: 0 },
    quarterTurns: 1,
  },
];
const CONNECTION_NODES: Node[] = [
  {
    id: "connection-source",
    label: "Source",
    assetId: "demo-system",
    position: { x: -2, z: 0 },
    quarterTurns: 0,
  },
  {
    id: "connection-target",
    label: "Target",
    assetId: "demo-system",
    position: { x: 2, z: 0 },
    quarterTurns: 2,
  },
];
const SCENARIO_NODES: Readonly<Record<string, readonly Node[]>> = {
  cache: [
    {
      id: "api",
      label: "API",
      assetId: "demo-system",
      position: { x: -2.5, z: 0 },
      quarterTurns: 0,
    },
    {
      id: "worker",
      label: "Worker",
      assetId: "demo-system",
      position: { x: 0, z: 0 },
      quarterTurns: 1,
    },
    {
      id: "database",
      label: "Database",
      assetId: "demo-system",
      position: { x: 2.5, z: 0 },
      quarterTurns: 2,
    },
  ],
  compressed: recoverableScenarioNodes("compressed"),
  invalid: [
    {
      id: "duplicate-node",
      label: "Demo system",
      assetId: "demo-system",
      position: { x: 0, z: 0 },
      quarterTurns: 1,
    },
    {
      id: "duplicate-node",
      label: "Duplicate system",
      assetId: "demo-system",
      position: { x: 2, z: 0 },
      quarterTurns: 0,
    },
  ],
  malformed: recoverableScenarioNodes("malformed"),
  missing: recoverableScenarioNodes("missing"),
  progressive: [
    {
      id: "frontend",
      label: "Frontend",
      assetId: "demo-system",
      position: { x: -1.5, z: 0 },
      quarterTurns: 0,
    },
    {
      id: "slow-worker",
      label: "Slow worker",
      assetId: "slow-system",
      position: { x: 1.5, z: 0 },
      quarterTurns: 1,
    },
  ],
};

function createScenarioNodes(): Node[] {
  if (showConnection) {
    return CONNECTION_NODES;
  }

  return [...(SCENARIO_NODES[scenario] ?? SINGLE_NODE)];
}

const demoNodes = createScenarioNodes();

async function resolveAliasedDemoAsset(
  assetId: string,
): Promise<ResolvedAsset> {
  const resolvedAsset = await resolveDemoAsset("demo-system");

  return {
    bytes: resolvedAsset.bytes,
    definition: {
      ...resolvedAsset.definition,
      assetId,
    },
  };
}

async function resolvePlaygroundAsset(assetId: string): Promise<ResolvedAsset> {
  if (assetId === "slow-system") {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 1_000);
    });
    return resolveAliasedDemoAsset(assetId);
  }

  if (assetId === "malformed-system") {
    const resolvedAsset = await resolveAliasedDemoAsset(assetId);
    return {
      ...resolvedAsset,
      bytes: new Uint8Array([1, 2, 3, 4]).buffer,
    };
  }

  if (assetId === "compressed-system") {
    const resolvedAsset = await resolveAliasedDemoAsset(assetId);
    return {
      ...resolvedAsset,
      bytes: markDemoGlbAsCompressed(resolvedAsset.bytes),
    };
  }

  return resolveDemoAsset(assetId);
}

function createDemoVisualization(): Visualization {
  if (scenario === "graph") {
    return PROJECT_GRAPH_VISUALIZATION;
  }

  return parseVisualization({
    schemaVersion: 1,
    nodes: demoNodes,
    groups: [],
    connections: showConnection
      ? [
          {
            id: "supported-connection",
            label: "Request",
            source: { nodeId: "connection-source" },
            target: { nodeId: "connection-target" },
            direction: "oneWay",
            routeAnchors: [],
          },
        ]
      : [],
    openingView: {
      cameraMode: "isometric",
      quarterTurns: 0,
      center: { x: 0, z: 0 },
      groundSpan: 12,
    },
  });
}

const demoVisualization = createDemoVisualization();

const loadingSnapshot: SceneRendererSnapshot = {
  diagnostics: [],
  status: "loading",
};

function appendStatus(
  history: SceneRendererStatus[],
  status: SceneRendererStatus,
): SceneRendererStatus[] {
  return history.at(-1) === status ? history : [...history, status];
}

function presentationForScenario(currentScenario: string): {
  readonly className: string;
  readonly lede: string;
} {
  return currentScenario === "graph"
    ? {
        className: "app app--graph",
        lede: "A host-resolved project system crossing the public renderer boundary.",
      }
    : {
        className: "app",
        lede: "A host-resolved GLB crossing the public renderer boundary.",
      };
}

interface SceneControlsProps {
  readonly cameraMode: OpeningView["cameraMode"];
  readonly cameraMotion: CameraMotion;
  readonly onCameraModeChange: (cameraMode: OpeningView["cameraMode"]) => void;
  readonly onCameraMotionChange: (cameraMotion: CameraMotion) => void;
}

function SceneControls({
  cameraMode,
  cameraMotion,
  onCameraModeChange,
  onCameraMotionChange,
}: SceneControlsProps) {
  return (
    <div className="scene-controls">
      <div className="motion-lab">
        <span className="control-label">Camera motion</span>
        <div aria-label="Camera motion profile" className="motion-profile">
          {CAMERA_MOTIONS.map((motion) => (
            <button
              aria-label={CAMERA_MOTION_COPY[motion].label}
              aria-pressed={cameraMotion === motion}
              key={motion}
              onClick={() => onCameraMotionChange(motion)}
              type="button"
            >
              {CAMERA_MOTION_COPY[motion].label}
            </button>
          ))}
        </div>
        <span className="motion-description">
          {CAMERA_MOTION_COPY[cameraMotion].description}
        </span>
      </div>
      <div aria-label="Camera mode" className="camera-mode">
        <button
          aria-pressed={cameraMode === "isometric"}
          onClick={() => onCameraModeChange("isometric")}
          type="button"
        >
          Isometric
        </button>
        <button
          aria-pressed={cameraMode === "top"}
          onClick={() => onCameraModeChange("top")}
          type="button"
        >
          Top
        </button>
      </div>
    </div>
  );
}

interface SceneMetricsProps {
  readonly assetResolveCount: number;
  readonly statusHistory: readonly SceneRendererStatus[];
}

function SceneMetrics({ assetResolveCount, statusHistory }: SceneMetricsProps) {
  const assetId = demoVisualization.nodes.at(0)?.assetId;
  const lifecycle = statusHistory.join(" → ") || "Starting";

  return (
    <dl>
      <div>
        <dt>Schema</dt>
        <dd>v{demoVisualization.schemaVersion}</dd>
      </div>
      <div>
        <dt>Asset</dt>
        <dd>{assetId}</dd>
      </div>
      <div>
        <dt>Nodes</dt>
        <dd data-testid="node-count">{demoVisualization.nodes.length}</dd>
      </div>
      <div>
        <dt>Connections</dt>
        <dd data-testid="connection-count">
          {demoVisualization.connections.length}
        </dd>
      </div>
      <div>
        <dt>Groups</dt>
        <dd data-testid="group-count">{demoVisualization.groups.length}</dd>
      </div>
      <div>
        <dt>Asset resolves</dt>
        <dd data-testid="asset-resolve-count">{assetResolveCount}</dd>
      </div>
      <div>
        <dt>Lifecycle</dt>
        <dd>{lifecycle}</dd>
      </div>
    </dl>
  );
}

interface RendererDiagnosticsProps {
  readonly diagnostics: SceneRendererSnapshot["diagnostics"];
}

function RendererDiagnostics({ diagnostics }: RendererDiagnosticsProps) {
  if (diagnostics.length === 0) {
    return null;
  }

  return (
    <ul aria-label="Renderer diagnostics">
      {diagnostics.map((diagnostic) => (
        <li key={`${diagnostic.code}:${diagnostic.entityId ?? "scene"}`}>
          <code>{diagnostic.code}</code>
          <span data-testid="diagnostic-severity">{diagnostic.severity}</span>
          <span>{diagnostic.message}</span>
        </li>
      ))}
    </ul>
  );
}

function App() {
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const [snapshot, setSnapshot] =
    useState<SceneRendererSnapshot>(loadingSnapshot);
  const [cameraMode, setCameraMode] = useState<OpeningView["cameraMode"]>(
    demoVisualization.openingView.cameraMode,
  );
  const [cameraMotion, setCameraMotion] =
    useState<CameraMotion>(initialCameraMotion);
  const [statusHistory, setStatusHistory] = useState<SceneRendererStatus[]>([]);
  const [assetResolveCount, setAssetResolveCount] = useState(0);

  useEffect(() => {
    const container = sceneContainerRef.current;

    if (container === null) {
      return;
    }

    const renderer = createSceneRenderer({
      cameraMotion: initialCameraMotion,
      container,
      resolveAsset: async (assetId) => {
        setAssetResolveCount((count) => count + 1);
        return resolvePlaygroundAsset(assetId);
      },
      visualization: demoVisualization,
    });
    rendererRef.current = renderer;
    const updateSnapshot = () => {
      const nextSnapshot = renderer.getSnapshot();
      setSnapshot(nextSnapshot);
      setStatusHistory((history) => appendStatus(history, nextSnapshot.status));
    };
    const unsubscribe = renderer.subscribe(updateSnapshot);

    updateSnapshot();

    return () => {
      rendererRef.current = null;
      unsubscribe();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.setCameraMode(cameraMode);
  }, [cameraMode]);

  useEffect(() => {
    rendererRef.current?.setCameraMotion(cameraMotion);
  }, [cameraMotion]);

  const selectCameraMotion = (motion: CameraMotion): void => {
    const nextSearchParameters = new URLSearchParams(window.location.search);

    nextSearchParameters.set("motion", motion);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${nextSearchParameters.toString()}`,
    );
    setCameraMotion(motion);
  };
  const presentation = presentationForScenario(scenario);

  return (
    <main className={presentation.className}>
      <p className="eyebrow">Open-source project visualization</p>
      <h1>Under Glass</h1>
      <p className="lede">{presentation.lede}</p>
      <SceneControls
        cameraMode={cameraMode}
        cameraMotion={cameraMotion}
        onCameraModeChange={setCameraMode}
        onCameraMotionChange={selectCameraMotion}
      />
      <div
        aria-label="Under Glass 3D scene"
        className="scene"
        ref={sceneContainerRef}
      />
      <SceneMetrics
        assetResolveCount={assetResolveCount}
        statusHistory={statusHistory}
      />
      <RendererDiagnostics diagnostics={snapshot.diagnostics} />
    </main>
  );
}

const rootElement = document.querySelector("#root");

if (!(rootElement instanceof HTMLElement)) {
  throw new Error("Under Glass playground root was not found.");
}

createRoot(rootElement).render(<App />);
