export interface LabelPoint {
  readonly x: number;
  readonly y: number;
}

export interface LabelRectangle {
  readonly maxX: number;
  readonly maxY: number;
  readonly minX: number;
  readonly minY: number;
}

export interface LabelSize {
  readonly height: number;
  readonly width: number;
}

const LABEL_GAP = 4;
const EDGE_INSET = 4;
const VERTICAL_STEP = 22;
const HORIZONTAL_STEP = 40;

export function labelRectangle(
  center: LabelPoint,
  size: LabelSize,
): LabelRectangle {
  return {
    minX: center.x - size.width / 2,
    minY: center.y - size.height / 2,
    maxX: center.x + size.width / 2,
    maxY: center.y + size.height / 2,
  };
}

export function rectanglesOverlap(
  first: LabelRectangle,
  second: LabelRectangle,
): boolean {
  return !(
    first.maxX + LABEL_GAP <= second.minX ||
    first.minX - LABEL_GAP >= second.maxX ||
    first.maxY + LABEL_GAP <= second.minY ||
    first.minY - LABEL_GAP >= second.maxY
  );
}

function isInsideViewport(
  rectangle: LabelRectangle,
  viewport: LabelSize,
): boolean {
  return (
    rectangle.minX >= EDGE_INSET &&
    rectangle.minY >= EDGE_INSET &&
    rectangle.maxX <= viewport.width - EDGE_INSET &&
    rectangle.maxY <= viewport.height - EDGE_INSET
  );
}

function candidateOffsets(): LabelPoint[] {
  const offsets: LabelPoint[] = [{ x: 0, y: 0 }];

  for (let ring = 1; ring <= 2; ring += 1) {
    const x = HORIZONTAL_STEP * ring;
    const y = VERTICAL_STEP * ring;

    offsets.push(
      { x: 0, y: -y },
      { x: 0, y },
      { x: -x, y: 0 },
      { x, y: 0 },
      { x: -x, y: -y },
      { x, y: -y },
      { x: -x, y },
      { x, y },
    );
  }

  return offsets;
}

const LABEL_OFFSETS = candidateOffsets();

export function findUnoccupiedLabelCenter(
  desired: LabelPoint,
  size: LabelSize,
  occupied: readonly LabelRectangle[],
  viewport: LabelSize,
): LabelPoint {
  for (const offset of LABEL_OFFSETS) {
    const candidate = {
      x: desired.x + offset.x,
      y: desired.y + offset.y,
    };
    const rectangle = labelRectangle(candidate, size);

    if (
      isInsideViewport(rectangle, viewport) &&
      occupied.every(
        (occupiedRectangle) => !rectanglesOverlap(rectangle, occupiedRectangle),
      )
    ) {
      return candidate;
    }
  }

  return desired;
}
