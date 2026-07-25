import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  parseVisualization,
  type Node,
  type OpeningView,
  type Visualization,
} from "@under-glass/core";
import {
  createEditorController,
  type CameraMotion,
  type EditorController,
  type EditorSnapshot,
  type ResolvedAsset,
  type SceneRendererStatus,
  type ViewerAccessibility,
  type ViewerSnapshot,
} from "@under-glass/web";
import {
  markDemoGlbAsCompressed,
  resolveDemoAsset,
} from "@under-glass/test-fixtures";

import {
  DEFAULT_POPCHOICE_VIEW_ID,
  POPCHOICE_VIEW_IDS,
  POPCHOICE_VIEWS,
  type PopChoiceViewId,
} from "./popchoice-visualization.js";
import { stressVisualization } from "./stress-visualization.js";
import "./styles.css";

const searchParameters = new URLSearchParams(window.location.search);
const showConnection = searchParameters.has("connections");
const scenario = searchParameters.get("scenario") ?? "graph";
const lifecycleEnabled =
  scenario === "lifecycle" || searchParameters.get("lifecycle") === "1";
const showPopChoiceVisualization =
  (scenario === "graph" || scenario === "lifecycle") && !showConnection;
const CAMERA_MOTIONS: readonly CameraMotion[] = ["responsive", "spring"];
const requestedCameraMotion = searchParameters.get("motion");
const requestedPopChoiceView = searchParameters.get("view");
const initialCameraMotion: CameraMotion =
  requestedCameraMotion !== null &&
  CAMERA_MOTIONS.includes(requestedCameraMotion as CameraMotion)
    ? (requestedCameraMotion as CameraMotion)
    : "responsive";
const initialPopChoiceView: PopChoiceViewId =
  requestedPopChoiceView !== null &&
  POPCHOICE_VIEW_IDS.includes(requestedPopChoiceView as PopChoiceViewId)
    ? (requestedPopChoiceView as PopChoiceViewId)
    : DEFAULT_POPCHOICE_VIEW_ID;

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

if (
  showPopChoiceVisualization &&
  requestedPopChoiceView !== null &&
  requestedPopChoiceView !== initialPopChoiceView
) {
  searchParameters.set("view", initialPopChoiceView);
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
      window.setTimeout(resolve, 3_000);
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

const fallbackVisualization =
  scenario === "stress" ? stressVisualization : createDemoVisualization();
const initialVisualization = showPopChoiceVisualization
  ? POPCHOICE_VIEWS[initialPopChoiceView].visualization
  : fallbackVisualization;

function loadingSnapshot(visualization: Visualization): EditorSnapshot {
  return {
    canRedo: false,
    canUndo: false,
    diagnostics: [],
    dragPreview: null,
    gridStep: 1,
    resourceMetrics: {
      cachedAssetCount: 0,
      nodeInstanceCount: 0,
      parsedAssetCount: 0,
    },
    selectedNodeId: null,
    status: "loading",
    visualization,
  };
}

function humanizeId(id: string): string {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const ACCESSIBLE_LABELS: Readonly<Record<string, string>> = {
  "connection:backoffice-postgres": "Backoffice project data access",
  "connection:backoffice-redis": "Backoffice queue access",
  "connection:backoffice-telemetry": "Backoffice telemetry",
  "connection:browser-web": "HTTPS request",
  "connection:bull-board-redis": "Queue inspection",
  "connection:movie-discovery-openai": "Embedding generation",
  "connection:movie-discovery-postgres": "Catalog persistence",
  "connection:movie-discovery-tmdb": "Movie metadata lookup",
  "connection:redis-workers": "Background jobs",
  "connection:supported-connection": "Request",
  "connection:telemetry-grafana": "Observable signals",
  "connection:web-postgres": "Recommendation query and results",
  "connection:web-redis": "Job enqueue",
  "connection:web-telemetry": "Web telemetry",
  "connection:workers-openai": "AI inference",
  "connection:workers-postgres": "Recommendation persistence",
  "connection:workers-telemetry": "Worker telemetry",
  "connection:workers-tmdb": "Movie metadata",
  "group:operations-external": "External providers",
  "group:operations-observability": "Observability",
  "group:operations-platform": "Platform data",
  "group:operations-signals": "Runtime signals",
  "group:operations-tools": "Operations tools",
  "group:recommendation-data": "Recommendation data",
  "group:recommendation-providers": "AI and content providers",
  "group:recommendation-runtime": "Recommendation runtime",
  "node:backoffice": "Backoffice",
  "node:browser": "Web browser",
  "node:bull-board": "Bull Board queue dashboard",
  "node:grafana": "Grafana",
  "node:movie-discovery": "Movie discovery service",
  "node:openai-api": "OpenAI API",
  "node:postgres": "PostgreSQL with pgvector",
  "node:redis": "Redis with BullMQ",
  "node:telemetry-stack": "Telemetry stack",
  "node:tmdb-api": "TMDB API",
  "node:web": "Web application",
  "node:workers": "Background workers",
};

const VIEWER_ACCESSIBILITY: ViewerAccessibility = {
  resolveEntityLabel: ({ id, kind }) =>
    ACCESSIBLE_LABELS[`${kind}:${id}`] ?? `${kind} ${humanizeId(id)}`,
  sceneLabel: showPopChoiceVisualization
    ? "PopChoice architecture"
    : "Under Glass demonstration architecture",
};

function appendStatus(
  history: SceneRendererStatus[],
  status: SceneRendererStatus,
): SceneRendererStatus[] {
  return history.at(-1) === status ? history : [...history, status];
}

function presentationForScenario(
  isPopChoiceVisualization: boolean,
  isStressVisualization: boolean,
  popChoiceDescription: string,
): {
  readonly className: string;
  readonly lede: string;
  readonly title: string;
} {
  if (isPopChoiceVisualization) {
    return {
      className: "app app--graph",
      lede: popChoiceDescription,
      title: "PopChoice architecture",
    };
  }

  if (isStressVisualization) {
    return {
      className: "app",
      lede: "200 Nodes · one repeated Asset ID · no Connections.",
      title: "200-Node stress fixture",
    };
  }

  return {
    className: "app",
    lede: "A host-resolved GLB crossing the public renderer boundary.",
    title: "Under Glass",
  };
}

interface ArchitectureViewSwitchProps {
  readonly activeViewId: PopChoiceViewId;
  readonly onViewChange: (viewId: PopChoiceViewId) => void;
}

function ArchitectureViewSwitch({
  activeViewId,
  onViewChange,
}: ArchitectureViewSwitchProps) {
  return (
    <div className="view-switch">
      <span className="control-label">Architecture view</span>
      <div aria-label="Architecture view" className="view-options">
        {POPCHOICE_VIEW_IDS.map((viewId) => {
          const view = POPCHOICE_VIEWS[viewId];

          return (
            <button
              aria-pressed={activeViewId === viewId}
              key={viewId}
              onClick={() => onViewChange(viewId)}
              type="button"
            >
              <span>{view.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
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
  readonly resourceMetrics: ViewerSnapshot["resourceMetrics"];
  readonly subjectLabel: string;
  readonly subjectValue: string | undefined;
  readonly statusHistory: readonly SceneRendererStatus[];
  readonly visualization: Visualization;
}

function SceneMetrics({
  assetResolveCount,
  resourceMetrics,
  subjectLabel,
  subjectValue,
  statusHistory,
  visualization,
}: SceneMetricsProps) {
  const lifecycle = statusHistory.join(" → ") || "Starting";

  return (
    <dl>
      <div>
        <dt>Schema</dt>
        <dd>v{visualization.schemaVersion}</dd>
      </div>
      <div>
        <dt>{subjectLabel}</dt>
        <dd>{subjectValue}</dd>
      </div>
      <div>
        <dt>Nodes</dt>
        <dd data-testid="node-count">{visualization.nodes.length}</dd>
      </div>
      <div>
        <dt>Connections</dt>
        <dd data-testid="connection-count">
          {visualization.connections.length}
        </dd>
      </div>
      <div>
        <dt>Groups</dt>
        <dd data-testid="group-count">{visualization.groups.length}</dd>
      </div>
      <div>
        <dt>Asset resolves</dt>
        <dd data-testid="asset-resolve-count">{assetResolveCount}</dd>
      </div>
      <div>
        <dt>Asset parses</dt>
        <dd data-testid="asset-parse-count">
          {resourceMetrics.parsedAssetCount}
        </dd>
      </div>
      <div>
        <dt>Cached assets</dt>
        <dd data-testid="asset-cache-count">
          {resourceMetrics.cachedAssetCount}
        </dd>
      </div>
      <div>
        <dt>Node instances</dt>
        <dd data-testid="node-instance-count">
          {resourceMetrics.nodeInstanceCount}
        </dd>
      </div>
      <div>
        <dt>Lifecycle</dt>
        <dd>{lifecycle}</dd>
      </div>
    </dl>
  );
}

function sceneMetricSubject(
  isPopChoiceVisualization: boolean,
  viewLabel: string,
  visualization: Visualization,
): {
  readonly label: string;
  readonly value: string | undefined;
} {
  if (isPopChoiceVisualization) {
    return { label: "View", value: viewLabel };
  }

  return {
    label: "Asset",
    value: visualization.nodes.at(0)?.assetId,
  };
}

interface RendererDiagnosticsProps {
  readonly diagnostics: ViewerSnapshot["diagnostics"];
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

interface EditorControlsProps {
  readonly snapshot: EditorSnapshot;
  readonly onGridStepChange: (gridStep: number | null) => void;
  readonly onRedo: () => void;
  readonly onUndo: () => void;
}

function placementStateFor(snapshot: EditorSnapshot): string | null {
  if (snapshot.dragPreview === null) {
    return null;
  }

  if (snapshot.dragPreview.valid) {
    return "Valid position";
  }

  return `Blocked by ${snapshot.dragPreview.conflictingNodeIds.join(", ")}`;
}

function nodePositionFor(
  node: EditorSnapshot["visualization"]["nodes"][number] | undefined,
): string {
  if (node === undefined) {
    return "—";
  }

  return `${node.position.x}, ${node.position.z}`;
}

function EditorSelection({ snapshot }: Pick<EditorControlsProps, "snapshot">) {
  const selectedNode = snapshot.visualization.nodes.find(
    (node) => node.id === snapshot.selectedNodeId,
  );
  const placementState = placementStateFor(snapshot);

  return (
    <p className="editor-selection" aria-live="polite">
      <span className="control-label">Selection</span>
      <strong>{selectedNode?.label ?? "None"}</strong>
      <span data-testid="selected-node-position">
        {nodePositionFor(selectedNode)}
      </span>
      {placementState === null ? null : (
        <span className="placement-state">{placementState}</span>
      )}
    </p>
  );
}

function GridSnapControls({
  onGridStepChange,
  snapshot,
}: Pick<EditorControlsProps, "onGridStepChange" | "snapshot">) {
  return (
    <div aria-label="Grid snapping" className="snap-options">
      <button
        aria-pressed={snapshot.gridStep === 1}
        onClick={() => onGridStepChange(1)}
        type="button"
      >
        Snap 1
      </button>
      <button
        aria-pressed={snapshot.gridStep === null}
        onClick={() => onGridStepChange(null)}
        type="button"
      >
        Free
      </button>
    </div>
  );
}

function HistoryControls({
  onRedo,
  onUndo,
  snapshot,
}: Pick<EditorControlsProps, "onRedo" | "onUndo" | "snapshot">) {
  return (
    <>
      <button disabled={!snapshot.canUndo} onClick={onUndo} type="button">
        Undo
      </button>
      <button disabled={!snapshot.canRedo} onClick={onRedo} type="button">
        Redo
      </button>
    </>
  );
}

function EditorControls(props: EditorControlsProps) {
  return (
    <div aria-label="Editor controls" className="editor-controls">
      <EditorSelection snapshot={props.snapshot} />
      <div className="editor-actions">
        <GridSnapControls
          onGridStepChange={props.onGridStepChange}
          snapshot={props.snapshot}
        />
        <HistoryControls
          onRedo={props.onRedo}
          onUndo={props.onUndo}
          snapshot={props.snapshot}
        />
      </div>
    </div>
  );
}

interface PlaygroundTitleProps {
  readonly presentation: ReturnType<typeof presentationForScenario>;
}

function PlaygroundTitle({ presentation }: PlaygroundTitleProps) {
  return (
    <div className="app-title">
      <p className="eyebrow">Under Glass</p>
      <h1>{presentation.title}</h1>
      <p className="lede">{presentation.lede}</p>
    </div>
  );
}

interface LifecycleControlsProps {
  readonly generation: number;
  readonly onRemount: () => void;
}

function LifecycleControls({ generation, onRemount }: LifecycleControlsProps) {
  return (
    <div aria-label="Lifecycle test controls" className="lifecycle-controls">
      <span>
        Session <strong data-testid="session-generation">{generation}</strong>
      </span>
      <button onClick={onRemount} type="button">
        Remount Editor Session
      </button>
    </div>
  );
}

function useEditorSession(initialVisualization: Visualization) {
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<EditorController | null>(null);
  const [visualization, setVisualization] =
    useState<Visualization>(initialVisualization);
  const [snapshot, setSnapshot] = useState<EditorSnapshot>(() =>
    loadingSnapshot(initialVisualization),
  );
  const [cameraMode, setCameraMode] = useState<OpeningView["cameraMode"]>(
    initialVisualization.openingView.cameraMode,
  );
  const [cameraMotion, setCameraMotion] =
    useState<CameraMotion>(initialCameraMotion);
  const [statusHistory, setStatusHistory] = useState<SceneRendererStatus[]>([]);
  const [assetResolveCount, setAssetResolveCount] = useState(0);
  const [sessionGeneration, setSessionGeneration] = useState(0);

  useEffect(() => {
    const container = sceneContainerRef.current;

    if (container === null) {
      return;
    }

    setSnapshot(loadingSnapshot(visualization));
    setStatusHistory([]);
    setAssetResolveCount(0);

    const controller = createEditorController({
      accessibility: VIEWER_ACCESSIBILITY,
      cameraMotion,
      container,
      gridStep: 1,
      onOperation: (event) => {
        setVisualization(event.visualization);
      },
      resolveAsset: async (assetId) => {
        setAssetResolveCount((count) => count + 1);
        return resolvePlaygroundAsset(assetId);
      },
      visualization,
    });
    controllerRef.current = controller;
    controller.setCameraMode(cameraMode, { transition: "immediate" });
    const updateSnapshot = () => {
      const nextSnapshot = controller.getSnapshot();
      setSnapshot(nextSnapshot);
      setStatusHistory((history) => appendStatus(history, nextSnapshot.status));
    };
    const unsubscribe = controller.subscribe(updateSnapshot);

    updateSnapshot();

    return () => {
      controllerRef.current = null;
      unsubscribe();
      controller.dispose();
    };
  }, [sessionGeneration]);

  useEffect(() => {
    const controller = controllerRef.current;

    if (
      controller === null ||
      controller.getSnapshot().visualization === visualization
    ) {
      return;
    }

    setSnapshot(loadingSnapshot(visualization));
    setStatusHistory([]);
    setAssetResolveCount(0);
    controller.setVisualization(visualization);
  }, [visualization]);

  useEffect(() => {
    controllerRef.current?.setCameraMode(cameraMode);
  }, [cameraMode]);

  useEffect(() => {
    controllerRef.current?.setCameraMotion(cameraMotion);
  }, [cameraMotion]);

  const updateCameraMotion = (motion: CameraMotion): void => {
    const nextSearchParameters = new URLSearchParams(window.location.search);

    nextSearchParameters.set("motion", motion);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${nextSearchParameters.toString()}`,
    );
    setCameraMotion(motion);
  };

  return {
    assetResolveCount,
    cameraMode,
    cameraMotion,
    redo: (): void => {
      controllerRef.current?.redo();
    },
    remount: (): void => {
      setSessionGeneration((generation) => generation + 1);
    },
    sceneContainerRef,
    sessionGeneration,
    setCameraMode,
    setGridStep: (gridStep: number | null): void => {
      controllerRef.current?.setGridStep(gridStep);
    },
    setVisualization,
    snapshot,
    statusHistory,
    undo: (): void => {
      controllerRef.current?.undo();
    },
    updateCameraMotion,
    visualization,
  };
}

function App() {
  const [popChoiceViewId, setPopChoiceViewId] =
    useState<PopChoiceViewId>(initialPopChoiceView);
  const activePopChoiceView = POPCHOICE_VIEWS[popChoiceViewId];
  const editorSession = useEditorSession(initialVisualization);
  const selectPopChoiceView = (viewId: PopChoiceViewId): void => {
    const nextView = POPCHOICE_VIEWS[viewId];
    const nextSearchParameters = new URLSearchParams(window.location.search);

    nextSearchParameters.set("view", viewId);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${nextSearchParameters.toString()}${window.location.hash}`,
    );
    editorSession.setCameraMode(nextView.visualization.openingView.cameraMode);
    setPopChoiceViewId(viewId);
    editorSession.setVisualization(nextView.visualization);
  };
  const presentation = presentationForScenario(
    showPopChoiceVisualization,
    scenario === "stress",
    activePopChoiceView.description,
  );
  const metricSubject = sceneMetricSubject(
    showPopChoiceVisualization,
    activePopChoiceView.label,
    editorSession.visualization,
  );

  return (
    <main className={presentation.className}>
      <header className="app-header">
        <PlaygroundTitle presentation={presentation} />
        <SceneControls
          cameraMode={editorSession.cameraMode}
          cameraMotion={editorSession.cameraMotion}
          onCameraModeChange={editorSession.setCameraMode}
          onCameraMotionChange={editorSession.updateCameraMotion}
        />
      </header>
      <div className="scene-stage">
        {lifecycleEnabled ? (
          <LifecycleControls
            generation={editorSession.sessionGeneration}
            onRemount={editorSession.remount}
          />
        ) : null}
        {showPopChoiceVisualization ? (
          <ArchitectureViewSwitch
            activeViewId={popChoiceViewId}
            onViewChange={selectPopChoiceView}
          />
        ) : null}
        <div
          aria-label="Under Glass 3D scene"
          className="scene"
          ref={editorSession.sceneContainerRef}
        />
        {showPopChoiceVisualization ? (
          <EditorControls
            onGridStepChange={editorSession.setGridStep}
            onRedo={editorSession.redo}
            onUndo={editorSession.undo}
            snapshot={editorSession.snapshot}
          />
        ) : null}
      </div>
      <aside className="scene-meta">
        <SceneMetrics
          assetResolveCount={editorSession.assetResolveCount}
          resourceMetrics={editorSession.snapshot.resourceMetrics}
          statusHistory={editorSession.statusHistory}
          subjectLabel={metricSubject.label}
          subjectValue={metricSubject.value}
          visualization={editorSession.visualization}
        />
      </aside>
      <RendererDiagnostics diagnostics={editorSession.snapshot.diagnostics} />
    </main>
  );
}

const rootElement = document.querySelector("#root");

if (!(rootElement instanceof HTMLElement)) {
  throw new Error("Under Glass playground root was not found.");
}

createRoot(rootElement).render(<App />);
