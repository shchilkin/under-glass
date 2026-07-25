import { describe, expect, it } from "vitest";

import { resolveEditorKeyboardCommand } from "./editor-keyboard.js";

const NO_MODIFIERS = {
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
} as const;

describe("resolveEditorKeyboardCommand", () => {
  it("resolves Escape only while a drag is active", () => {
    const escapeKey = { ...NO_MODIFIERS, key: "Escape" };

    expect(resolveEditorKeyboardCommand(escapeKey, true)).toBe("cancel");
    expect(resolveEditorKeyboardCommand(escapeKey, false)).toBeNull();
  });

  it.each([
    [{ ...NO_MODIFIERS, key: "z", metaKey: true }, "undo"],
    [{ ...NO_MODIFIERS, ctrlKey: true, key: "Z" }, "undo"],
    [{ ...NO_MODIFIERS, key: "z", metaKey: true, shiftKey: true }, "redo"],
    [{ ...NO_MODIFIERS, ctrlKey: true, key: "y" }, "redo"],
  ] as const)("maps %o to %s", (input, command) => {
    expect(resolveEditorKeyboardCommand(input, false)).toBe(command);
  });

  it("ignores unmodified and unsupported shortcuts", () => {
    expect(
      resolveEditorKeyboardCommand({ ...NO_MODIFIERS, key: "z" }, false),
    ).toBeNull();
    expect(
      resolveEditorKeyboardCommand(
        { ...NO_MODIFIERS, key: "y", metaKey: true },
        false,
      ),
    ).toBeNull();
    expect(
      resolveEditorKeyboardCommand(
        { ...NO_MODIFIERS, ctrlKey: true, key: "a" },
        false,
      ),
    ).toBeNull();
  });
});
