import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { parseVisualization } from "@under-glass/core";
import {
  createSceneRenderer,
  type SceneRendererSnapshot,
  type SceneRendererStatus,
} from "@under-glass/three";

import { resolveDemoAsset } from "./demo-asset.js";
import "./styles.css";

const showUnsupportedConnection = new URLSearchParams(
  window.location.search,
).has("connections");

const demoVisualization = parseVisualization({
  schemaVersion: 1,
  nodes: [
    {
      id: "demo-node",
      label: "Demo system",
      assetId: "demo-system",
      position: { x: 0, z: 0 },
      quarterTurns: 1,
    },
  ],
  groups: [],
  connections: showUnsupportedConnection
    ? [
        {
          id: "unsupported-connection",
          label: "",
          source: { nodeId: "demo-node" },
          target: { nodeId: "demo-node" },
          direction: "undirected",
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

function App() {
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const [snapshot, setSnapshot] =
    useState<SceneRendererSnapshot>(loadingSnapshot);
  const [statusHistory, setStatusHistory] = useState<SceneRendererStatus[]>([]);

  useEffect(() => {
    const container = sceneContainerRef.current;

    if (container === null) {
      return;
    }

    const renderer = createSceneRenderer({
      container,
      resolveAsset: resolveDemoAsset,
      visualization: demoVisualization,
    });
    const updateSnapshot = () => {
      const nextSnapshot = renderer.getSnapshot();
      setSnapshot(nextSnapshot);
      setStatusHistory((history) => appendStatus(history, nextSnapshot.status));
    };
    const unsubscribe = renderer.subscribe(updateSnapshot);

    updateSnapshot();

    return () => {
      unsubscribe();
      renderer.dispose();
    };
  }, []);

  return (
    <main>
      <p className="eyebrow">Open-source project visualization</p>
      <h1>Under Glass</h1>
      <p className="lede">
        A host-resolved GLB crossing the public renderer boundary.
      </p>
      <div
        aria-label="Under Glass 3D scene"
        className="scene"
        ref={sceneContainerRef}
      />
      <dl>
        <div>
          <dt>Schema</dt>
          <dd>v{demoVisualization.schemaVersion}</dd>
        </div>
        <div>
          <dt>Asset</dt>
          <dd>{demoVisualization.nodes[0]?.assetId}</dd>
        </div>
        <div>
          <dt>Lifecycle</dt>
          <dd>{statusHistory.join(" → ") || "Starting"}</dd>
        </div>
      </dl>
      {snapshot.diagnostics.length > 0 ? (
        <ul aria-label="Renderer diagnostics">
          {snapshot.diagnostics.map((diagnostic) => (
            <li key={`${diagnostic.code}:${diagnostic.entityId ?? "scene"}`}>
              <code>{diagnostic.code}</code>
              <span>{diagnostic.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}

const rootElement = document.querySelector("#root");

if (!(rootElement instanceof HTMLElement)) {
  throw new Error("Under Glass playground root was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
