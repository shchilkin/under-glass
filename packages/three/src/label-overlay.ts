import { OrthographicCamera, Vector3 } from "three";

import type { BasicConnectionRoute, Visualization } from "@under-glass/core";

import {
  findUnoccupiedLabelCenter,
  labelRectangle,
  type LabelPoint,
  type LabelRectangle,
  type LabelSize,
} from "./label-layout.js";

interface ProjectedLabel {
  readonly element: HTMLDivElement;
  readonly offset: LabelPoint;
  readonly points: readonly Vector3[];
  readonly type: "connection" | "group" | "node";
}

export interface LabelOverlay {
  dispose(): void;
  render(camera: OrthographicCamera): void;
  setRoutes(routes: readonly BasicConnectionRoute[]): void;
}

function styleLabel(element: HTMLDivElement): void {
  element.style.position = "absolute";
  element.style.top = "0";
  element.style.left = "0";
  element.style.pointerEvents = "none";
  element.style.whiteSpace = "nowrap";
  element.dataset.underGlassLabelRendering = "world-space";
  element.style.width = "1px";
  element.style.height = "1px";
  element.style.overflow = "hidden";
  element.style.clipPath = "inset(50%)";
}

function createLabel(
  layer: HTMLDivElement,
  text: string,
  type: ProjectedLabel["type"],
  points: readonly Vector3[],
  offset: LabelPoint = { x: 0, y: 0 },
): ProjectedLabel {
  const element = document.createElement("div");
  element.dataset.underGlassLabel = type;
  element.textContent = text;
  styleLabel(element);
  layer.append(element);
  return { element, offset, points, type };
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
  layer.setAttribute("aria-hidden", "true");
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
      [new Vector3(node.position.x, 0.02, node.position.z)],
      { x: 0, y: 18 },
    ),
  );
  const groupLabels = visualization.groups.map((group) =>
    createLabel(layer, group.label ?? group.id, "group", [
      new Vector3(group.bounds.minX + 0.35, 0.08, group.bounds.minZ + 0.35),
      new Vector3(group.bounds.maxX - 0.35, 0.08, group.bounds.minZ + 0.35),
      new Vector3(group.bounds.minX + 0.35, 0.08, group.bounds.maxZ - 0.35),
      new Vector3(group.bounds.maxX - 0.35, 0.08, group.bounds.maxZ - 0.35),
    ]),
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

interface ProjectedScreenLabel {
  readonly hidden: boolean;
  readonly label: ProjectedLabel;
  readonly position: LabelPoint;
}

function projectLabel(
  label: ProjectedLabel,
  camera: OrthographicCamera,
  viewport: LabelSize,
): ProjectedScreenLabel {
  const { height, width } = viewport;
  const projectedCandidates = label.points.map((point) =>
    point.clone().project(camera),
  );
  const projected =
    label.type === "group"
      ? projectedCandidates.reduce((best, candidate) => {
          const bestY = (-best.y * 0.5 + 0.5) * height;
          const candidateY = (-candidate.y * 0.5 + 0.5) * height;

          if (Math.abs(candidateY - bestY) < 1) {
            return candidate.x < best.x ? candidate : best;
          }

          return candidateY < bestY ? candidate : best;
        })
      : projectedCandidates[0]!;
  const x = (projected.x * 0.5 + 0.5) * width + label.offset.x;
  const y = (-projected.y * 0.5 + 0.5) * height + label.offset.y;

  return {
    hidden: isLabelOutsideViewport(projected, x, y, width, height),
    label,
    position: { x, y },
  };
}

function positionLabel(
  projected: ProjectedScreenLabel,
  position: LabelPoint,
): void {
  projected.label.element.style.transform =
    `translate3d(${position.x}px, ${position.y}px, 0) ` +
    labelAnchor(projected.label.type);
}

function projectedLabelRectangle(
  projected: ProjectedScreenLabel,
): LabelRectangle {
  const element = projected.label.element;
  const center =
    projected.label.type === "group"
      ? {
          x: projected.position.x + element.offsetWidth / 2,
          y: projected.position.y,
        }
      : projected.position;

  return labelRectangle(center, {
    height: element.offsetHeight,
    width: element.offsetWidth,
  });
}

function placeStaticLabels(
  projectedLabels: readonly ProjectedScreenLabel[],
  occupied: LabelRectangle[],
): void {
  for (const projected of projectedLabels) {
    if (projected.hidden || projected.label.type === "connection") {
      continue;
    }

    positionLabel(projected, projected.position);
    occupied.push(projectedLabelRectangle(projected));
  }
}

function placeConnectionLabels(
  projectedLabels: readonly ProjectedScreenLabel[],
  occupied: LabelRectangle[],
  viewport: LabelSize,
): void {
  for (const projected of projectedLabels) {
    if (projected.hidden || projected.label.type !== "connection") {
      continue;
    }

    const element = projected.label.element;
    const position = findUnoccupiedLabelCenter(
      projected.position,
      { height: element.offsetHeight, width: element.offsetWidth },
      occupied,
      viewport,
    );
    const placed = { ...projected, position };

    positionLabel(placed, position);
    occupied.push(projectedLabelRectangle(placed));
  }
}

function renderLabels(
  labels: readonly ProjectedLabel[],
  camera: OrthographicCamera,
  container: HTMLElement,
): void {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const viewport = { height, width };
  const projectedLabels = labels.map((label) =>
    projectLabel(label, camera, viewport),
  );
  const occupied: LabelRectangle[] = [];

  for (const projected of projectedLabels) {
    projected.label.element.hidden = projected.hidden;
  }

  placeStaticLabels(projectedLabels, occupied);
  placeConnectionLabels(projectedLabels, occupied, viewport);
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
      createLabel(layer, route.label, "connection", [routeLabelPoint(route)]),
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
