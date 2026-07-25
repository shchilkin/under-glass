import {
  applyMoveNodeOperation,
  invertMoveNodeOperation,
  type MoveNodeOperation,
} from "./editor-operation.js";
import type { Visualization } from "./visualization.js";

export interface EditorHistorySnapshot {
  readonly canRedo: boolean;
  readonly canUndo: boolean;
}

export interface EditorHistoryTransition {
  readonly operation: MoveNodeOperation;
  readonly source: "redo" | "undo";
  readonly visualization: Visualization;
}

export interface CreateEditorOperationHistoryOptions {
  readonly capacity?: number;
}

export interface EditorOperationHistory {
  clear(): void;
  commit(
    visualization: Visualization,
    operation: MoveNodeOperation,
  ): Visualization;
  getSnapshot(): EditorHistorySnapshot;
  redo(visualization: Visualization): EditorHistoryTransition | null;
  undo(visualization: Visualization): EditorHistoryTransition | null;
}

export function createEditorOperationHistory(
  options: CreateEditorOperationHistoryOptions = {},
): EditorOperationHistory {
  const capacity = options.capacity ?? 100;

  if (!Number.isInteger(capacity) || capacity <= 0) {
    throw new Error("Editor history capacity must be a positive integer.");
  }

  const past: MoveNodeOperation[] = [];
  const future: MoveNodeOperation[] = [];

  return {
    clear(): void {
      past.length = 0;
      future.length = 0;
    },
    commit(
      visualization: Visualization,
      operation: MoveNodeOperation,
    ): Visualization {
      const nextVisualization = applyMoveNodeOperation(
        visualization,
        operation,
      );
      past.push(operation);
      if (past.length > capacity) {
        past.shift();
      }
      future.length = 0;
      return nextVisualization;
    },
    getSnapshot(): EditorHistorySnapshot {
      return {
        canRedo: future.length > 0,
        canUndo: past.length > 0,
      };
    },
    redo(visualization: Visualization): EditorHistoryTransition | null {
      const operation = future.pop();

      if (operation === undefined) {
        return null;
      }

      const nextVisualization = applyMoveNodeOperation(
        visualization,
        operation,
      );
      past.push(operation);
      return {
        operation,
        source: "redo",
        visualization: nextVisualization,
      };
    },
    undo(visualization: Visualization): EditorHistoryTransition | null {
      const operation = past.pop();

      if (operation === undefined) {
        return null;
      }

      const inverse = invertMoveNodeOperation(operation);
      const nextVisualization = applyMoveNodeOperation(visualization, inverse);
      future.push(operation);
      return {
        operation: inverse,
        source: "undo",
        visualization: nextVisualization,
      };
    },
  };
}
