export type EditorKeyboardCommand = "cancel" | "redo" | "undo";

export interface EditorKeyboardInput {
  readonly ctrlKey: boolean;
  readonly key: string;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
}

function hasHistoryModifier(input: EditorKeyboardInput): boolean {
  return input.metaKey || input.ctrlKey;
}

function isAlternateRedo(input: EditorKeyboardInput): boolean {
  return input.ctrlKey && input.key.toLowerCase() === "y";
}

function resolveHistoryCommand(
  input: EditorKeyboardInput,
): Exclude<EditorKeyboardCommand, "cancel"> | null {
  if (!hasHistoryModifier(input)) {
    return null;
  }

  if (input.key.toLowerCase() === "z") {
    return input.shiftKey ? "redo" : "undo";
  }

  return isAlternateRedo(input) ? "redo" : null;
}

export function resolveEditorKeyboardCommand(
  input: EditorKeyboardInput,
  hasActiveDrag: boolean,
): EditorKeyboardCommand | null {
  if (hasActiveDrag && input.key === "Escape") {
    return "cancel";
  }

  return resolveHistoryCommand(input);
}
