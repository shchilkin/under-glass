import type { SceneRendererSnapshot } from "@under-glass/three";

import type { ViewerSemanticGraph } from "./semantic-graph.js";

const visuallyHiddenStyles: Partial<CSSStyleDeclaration> = {
  border: "0",
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: "0",
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
};

const focusedControlStyles: Partial<CSSStyleDeclaration> = {
  background: "rgba(8, 16, 14, 0.97)",
  border: "1px solid rgba(183, 236, 207, 0.32)",
  borderRadius: "0.75rem",
  clip: "auto",
  clipPath: "none",
  color: "#dce8e2",
  height: "auto",
  left: "0.75rem",
  margin: "0",
  maxHeight: "min(28rem, calc(100% - 1.5rem))",
  overflow: "auto",
  padding: "0.75rem 1rem",
  position: "absolute",
  top: "0.75rem",
  whiteSpace: "normal",
  width: "min(22rem, calc(100% - 1.5rem))",
  zIndex: "3",
};

export interface ViewerSemanticLayer {
  dispose(): void;
  setGraph(graph: ViewerSemanticGraph): void;
  setRendererSnapshot(snapshot: SceneRendererSnapshot): void;
  setSelectedNodeId(nodeId: string | null): void;
}

export type ViewerSemanticLayerFactory = (
  container: HTMLElement,
  graph: ViewerSemanticGraph,
  options?: ViewerSemanticLayerOptions,
) => ViewerSemanticLayer;

export interface ViewerSemanticLayerOptions {
  readonly onNodeActivate?: (nodeId: string) => void;
}

function appendListItem(
  document: Document,
  list: HTMLUListElement,
  label: string,
  dataAttribute: string,
  id: string,
): HTMLLIElement {
  const item = document.createElement("li");
  item.dataset[dataAttribute] = id;
  item.textContent = label;
  list.append(item);
  return item;
}

function appendNodeListItem(
  document: Document,
  list: HTMLUListElement,
  node: ViewerSemanticGraph["ungroupedNodes"][number],
  options: ViewerSemanticLayerOptions,
  selectedNodeId: string | null,
): void {
  const item = document.createElement("li");
  item.dataset.underGlassSemanticNode = node.id;

  if (options.onNodeActivate === undefined) {
    item.textContent = node.label;
  } else {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = node.label;
    button.dataset.underGlassSemanticNodeControl = node.id;
    button.setAttribute("aria-pressed", String(selectedNodeId === node.id));
    button.addEventListener("click", () => {
      options.onNodeActivate?.(node.id);
    });
    item.append(button);
  }

  list.append(item);
}

function renderGraph(
  root: HTMLElement,
  graph: ViewerSemanticGraph,
  options: ViewerSemanticLayerOptions,
  selectedNodeId: string | null,
): void {
  const document = root.ownerDocument;
  root.replaceChildren();
  root.setAttribute("aria-label", graph.label);

  const heading = document.createElement("h2");
  heading.textContent = graph.label;
  root.append(heading);

  if (graph.groups.length > 0) {
    const heading = document.createElement("h3");
    heading.textContent = "Groups";
    root.append(heading);

    const list = document.createElement("ul");
    for (const group of graph.groups) {
      const groupItem = appendListItem(
        document,
        list,
        group.label,
        "underGlassSemanticGroup",
        group.id,
      );
      const members = document.createElement("ul");
      members.setAttribute("aria-label", `${group.label} nodes`);
      for (const node of group.nodes) {
        appendNodeListItem(document, members, node, options, selectedNodeId);
      }
      groupItem.append(members);
    }
    root.append(list);
  }

  if (graph.ungroupedNodes.length > 0) {
    const heading = document.createElement("h3");
    heading.textContent = "Ungrouped nodes";
    root.append(heading);

    const list = document.createElement("ul");
    for (const node of graph.ungroupedNodes) {
      appendNodeListItem(document, list, node, options, selectedNodeId);
    }
    root.append(list);
  }

  if (graph.connections.length > 0) {
    const heading = document.createElement("h3");
    heading.textContent = "Connections";
    root.append(heading);

    const list = document.createElement("ul");
    for (const connection of graph.connections) {
      const relation =
        connection.direction === "oneWay"
          ? `${connection.source.label} to ${connection.target.label}, one way`
          : `${connection.source.label} and ${connection.target.label}, ${connection.direction}`;
      appendListItem(
        document,
        list,
        `${connection.label}: ${relation}.`,
        "underGlassSemanticConnection",
        connection.id,
      );
    }
    root.append(list);
  }
}

function isRendererUnavailable(snapshot: SceneRendererSnapshot): boolean {
  return (
    snapshot.status === "failed" &&
    snapshot.diagnostics.some(
      (diagnostic) => diagnostic.code === "renderer-unavailable",
    )
  );
}

export function createViewerSemanticLayer(
  container: HTMLElement,
  graph: ViewerSemanticGraph,
  options: ViewerSemanticLayerOptions = {},
): ViewerSemanticLayer {
  const document = container.ownerDocument;
  const root = document.createElement("section");
  root.dataset.underGlassSemanticSummary = "";
  root.setAttribute("role", "region");
  Object.assign(root.style, visuallyHiddenStyles);

  const fallback = document.createElement("div");
  fallback.dataset.underGlassRendererFallback = "";
  fallback.setAttribute("role", "status");
  fallback.hidden = true;
  fallback.textContent =
    "3D rendering is unavailable. The complete architecture summary remains available to assistive technology.";
  Object.assign(fallback.style, {
    alignItems: "center",
    background: "rgba(8, 16, 14, 0.94)",
    color: "#dce8e2",
    display: "none",
    inset: "0",
    justifyContent: "center",
    padding: "2rem",
    position: "absolute",
    textAlign: "center",
    zIndex: "2",
  } satisfies Partial<CSSStyleDeclaration>);

  const defaultView = document.defaultView;
  if (
    defaultView !== null &&
    defaultView.getComputedStyle(container).position === "static"
  ) {
    container.style.position = "relative";
  }

  let selectedNodeId: string | null = null;
  const showKeyboardControls = (): void => {
    Object.assign(root.style, focusedControlStyles);
  };
  const hideKeyboardControls = (event: FocusEvent): void => {
    if (
      event.relatedTarget !== null &&
      root.contains(event.relatedTarget as globalThis.Node)
    ) {
      return;
    }

    root.removeAttribute("style");
    Object.assign(root.style, visuallyHiddenStyles);
  };
  root.addEventListener("focusin", showKeyboardControls);
  root.addEventListener("focusout", hideKeyboardControls);
  renderGraph(root, graph, options, selectedNodeId);
  container.append(root, fallback);

  return {
    dispose() {
      root.removeEventListener("focusin", showKeyboardControls);
      root.removeEventListener("focusout", hideKeyboardControls);
      root.remove();
      fallback.remove();
    },
    setGraph(nextGraph) {
      renderGraph(root, nextGraph, options, selectedNodeId);
    },
    setRendererSnapshot(snapshot) {
      const unavailable = isRendererUnavailable(snapshot);
      fallback.hidden = !unavailable;
      fallback.style.display = unavailable ? "flex" : "none";
    },
    setSelectedNodeId(nodeId) {
      selectedNodeId = nodeId;
      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-under-glass-semantic-node-control]",
      )) {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.underGlassSemanticNodeControl === nodeId),
        );
      }
    },
  };
}
