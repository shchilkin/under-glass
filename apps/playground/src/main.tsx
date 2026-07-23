import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { parseVisualization } from "@under-glass/core";

import "./styles.css";

const emptyVisualization = parseVisualization({
  schemaVersion: 1,
  nodes: [],
  groups: [],
  connections: [],
  openingView: {
    cameraMode: "isometric",
    quarterTurns: 0,
    center: { x: 0, z: 0 },
    groundSpan: 12,
  },
});

function App() {
  return (
    <main>
      <p className="eyebrow">Open-source project visualization</p>
      <h1>Under Glass</h1>
      <p className="lede">
        The package boundaries are in place. The first scene comes next.
      </p>
      <dl>
        <div>
          <dt>Schema</dt>
          <dd>v{emptyVisualization.schemaVersion}</dd>
        </div>
        <div>
          <dt>Camera</dt>
          <dd>{emptyVisualization.openingView.cameraMode}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>Bootstrap ready</dd>
        </div>
      </dl>
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
