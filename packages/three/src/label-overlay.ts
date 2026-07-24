import { OrthographicCamera, Vector3 } from "three";

import type { BasicConnectionRoute, Visualization } from "@under-glass/core";

interface ProjectedLabel {
  readonly element: HTMLDivElement;
  readonly point: Vector3;
  readonly type: "connection" | "group" | "node";
}

export interface LabelOverlay {
  dispose(): void;
  render(camera: OrthographicCamera): void;
  setRoutes(routes: readonly BasicConnectionRoute[]): void;
}

function styleLabel(
  element: HTMLDivElement,
  type: ProjectedLabel["type"],
): void {
  element.style.position = "absolute";
  element.style.top = "0";
  element.style.left = "0";
  element.style.pointerEvents = "none";
  element.style.whiteSpace = "nowrap";
  element.style.fontFamily =
    '"SFMono-Regular", Consolas, "Liberation Mono", ui-monospace, monospace';

  if (type === "node") {
    element.style.padding = "4px 7px";
    element.style.border = "1px solid rgb(220 229 224 / 18%)";
    element.style.borderRadius = "5px";
    element.style.color = "#f0f4f2";
    element.style.background = "rgb(9 13 12 / 92%)";
    element.style.fontSize = "12px";
  } else if (type === "group") {
    element.style.color = "#78877f";
    element.style.fontSize = "12px";
    element.style.fontWeight = "700";
    element.style.letterSpacing = "0.16em";
    element.style.textTransform = "uppercase";
  } else {
    element.style.padding = "3px 6px";
    element.style.borderRadius = "4px";
    element.style.color = "#aebbb5";
    element.style.background = "rgb(9 13 12 / 82%)";
    element.style.fontSize = "10px";
  }
}

function createLabel(
  layer: HTMLDivElement,
  text: string,
  type: ProjectedLabel["type"],
  point: Vector3,
): ProjectedLabel {
  const element = document.createElement("div");
  element.dataset.underGlassLabel = type;
  element.textContent = text;
  styleLabel(element, type);
  layer.append(element);
  return { element, point, type };
}

function routeLabelPoint(route: BasicConnectionRoute): Vector3 {
  const point = route.points[Math.floor(route.points.length / 2)] ?? {
    x: 0,
    z: 0,
  };
  return new Vector3(point.x, 0.24, point.z);
}

function createOverlayLayer(container: HTMLElement): HTMLDivElement {
  const layer = document.createElement("div");

  if (getComputedStyle(container).position === "static") {
    container.style.position = "relative";
  }

  layer.dataset.underGlassLabels = "";
  layer.setAttribute("aria-label", "Visualization labels");
  layer.style.position = "absolute";
  layer.style.inset = "0";
  layer.style.overflow = "hidden";
  layer.style.pointerEvents = "none";
  layer.style.zIndex = "2";
  container.append(layer);
  return layer;
}

function createVisualizationLabels(
  layer: HTMLDivElement,
  visualization: Visualization,
): ProjectedLabel[] {
  const nodeLabels = visualization.nodes.map((node) =>
    createLabel(
      layer,
      node.label,
      "node",
      new Vector3(node.position.x, 0.15, node.position.z + 0.8),
    ),
  );
  const groupLabels = visualization.groups.map((group) =>
    createLabel(
      layer,
      group.label ?? group.id,
      "group",
      new Vector3(group.bounds.minX + 0.35, 0.08, group.bounds.minZ + 0.35),
    ),
  );
  return [...nodeLabels, ...groupLabels];
}

function labelAnchor(type: ProjectedLabel["type"]): string {
  return type === "group" ? "translate(0, -50%)" : "translate(-50%, -50%)";
}

function isLabelOutsideViewport(
  projected: Vector3,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  return [
    projected.z < -1,
    projected.z > 1,
    x < -100,
    x > width + 100,
    y < -50,
    y > height + 50,
  ].some(Boolean);
}

function renderProjectedLabel(
  label: ProjectedLabel,
  camera: OrthographicCamera,
  width: number,
  height: number,
): void {
  const projected = label.point.clone().project(camera);
  const x = (projected.x * 0.5 + 0.5) * width;
  const y = (-projected.y * 0.5 + 0.5) * height;
  label.element.style.transform = `translate3d(${x}px, ${y}px, 0) ${labelAnchor(label.type)}`;
  label.element.hidden = isLabelOutsideViewport(projected, x, y, width, height);
}

function renderLabels(
  labels: readonly ProjectedLabel[],
  camera: OrthographicCamera,
  container: HTMLElement,
): void {
  const width = container.clientWidth;
  const height = container.clientHeight;

  for (const label of labels) {
    renderProjectedLabel(label, camera, width, height);
  }
}

function removeLabels(labels: readonly ProjectedLabel[]): void {
  for (const label of labels) {
    label.element.remove();
  }
}

function createRouteLabels(
  layer: HTMLDivElement,
  routes: readonly BasicConnectionRoute[],
): ProjectedLabel[] {
  return routes
    .filter((route) => route.label.length > 0)
    .map((route) =>
      createLabel(layer, route.label, "connection", routeLabelPoint(route)),
    );
}

export function createLabelOverlay(
  container: HTMLElement,
  visualization: Visualization,
): LabelOverlay {
  const layer = createOverlayLayer(container);
  const labels = createVisualizationLabels(layer, visualization);
  let routeLabels: ProjectedLabel[] = [];

  return {
    dispose(): void {
      layer.remove();
    },
    render(camera: OrthographicCamera): void {
      renderLabels([...labels, ...routeLabels], camera, container);
    },
    setRoutes(routes: readonly BasicConnectionRoute[]): void {
      removeLabels(routeLabels);
      routeLabels = createRouteLabels(layer, routes);
    },
  };
}
