import { parseVisualization, type OpeningView } from "@under-glass/core";
import { createViewerController, type ViewerSnapshot } from "@under-glass/web";
import { resolveDemoAsset } from "@under-glass/test-fixtures";

import visualizationDocument from "./visualization.json" with { type: "json" };
import "./styles.css";

function requireElement<T extends Element>(
  selector: string,
  guard: (element: Element) => element is T,
): T {
  const element = document.querySelector(selector);

  if (element === null || !guard(element)) {
    throw new Error(`Required element "${selector}" was not found.`);
  }

  return element;
}

const viewerElement = requireElement(
  "#viewer",
  (element): element is HTMLElement => element instanceof HTMLElement,
);
const statusElement = requireElement(
  "#status",
  (element): element is HTMLElement => element instanceof HTMLElement,
);
const nodeCountElement = requireElement(
  "#node-count",
  (element): element is HTMLElement => element instanceof HTMLElement,
);
const cameraButtons = [
  ...document.querySelectorAll<HTMLButtonElement>("[data-camera-mode]"),
];
const visualization = parseVisualization(visualizationDocument);
const statusHistory: ViewerSnapshot["status"][] = [];
const controller = createViewerController({
  cameraMotion: "responsive",
  container: viewerElement,
  resolveAsset: resolveDemoAsset,
  visualization,
});

function renderSnapshot(): void {
  const snapshot = controller.getSnapshot();

  if (statusHistory.at(-1) !== snapshot.status) {
    statusHistory.push(snapshot.status);
  }

  statusElement.textContent = statusHistory.join(" → ");
  nodeCountElement.textContent = String(snapshot.visualization.nodes.length);
}

function selectCameraMode(cameraMode: OpeningView["cameraMode"]): void {
  controller.setCameraMode(cameraMode);

  for (const button of cameraButtons) {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.cameraMode === cameraMode),
    );
  }
}

for (const button of cameraButtons) {
  button.addEventListener("click", () => {
    const cameraMode = button.dataset.cameraMode;

    if (cameraMode === "isometric" || cameraMode === "top") {
      selectCameraMode(cameraMode);
    }
  });
}

const unsubscribe = controller.subscribe(renderSnapshot);
renderSnapshot();

window.addEventListener(
  "beforeunload",
  () => {
    unsubscribe();
    controller.dispose();
  },
  { once: true },
);
