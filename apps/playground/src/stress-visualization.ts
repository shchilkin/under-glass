import {
  parseVisualization,
  type Node,
  type Visualization,
} from "@under-glass/core";

export const STRESS_NODE_COUNT = 200;

const STRESS_COLUMN_COUNT = 20;
const STRESS_COLUMN_SPACING = 2;
const STRESS_ROW_SPACING = 2;
const STRESS_MIN_X = -19;
const STRESS_MIN_Z = -9;

function createStressNodes(): readonly Node[] {
  return Array.from({ length: STRESS_NODE_COUNT }, (_value, index) => {
    const column = index % STRESS_COLUMN_COUNT;
    const row = Math.floor(index / STRESS_COLUMN_COUNT);
    const sequence = String(index + 1).padStart(3, "0");

    return {
      id: `stress-node-${sequence}`,
      label: `Node ${sequence}`,
      assetId: "service-asset",
      position: {
        x: STRESS_MIN_X + column * STRESS_COLUMN_SPACING,
        z: STRESS_MIN_Z + row * STRESS_ROW_SPACING,
      },
      quarterTurns: 0,
    };
  });
}

export const stressVisualization: Visualization = parseVisualization({
  schemaVersion: 1,
  nodes: createStressNodes(),
  groups: [],
  connections: [],
  openingView: {
    cameraMode: "isometric",
    center: { x: 0, z: 0 },
    groundSpan: 46,
    quarterTurns: 0,
  },
});
