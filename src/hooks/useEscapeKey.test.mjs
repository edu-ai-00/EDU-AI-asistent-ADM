// node:test suite for closing modals with ESC (BR-96MNEE). Run with
// `npm test`.
//
// The listener is tested directly; the hand-rolled modals that were reported
// are client components with no renderer here, so they are read as source and
// checked for the hook call.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import ts from "typescript";

// useEscapeKey.ts imports through the `@/` path alias, which only Next
// resolves: map it onto src/ (with the .ts extension Node needs).
const src = new URL("../", import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`${specifier.slice(2)}.ts`, src).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { escapeListener } = await import("./useEscapeKey.ts");

test("ESC closes the window", () => {
  let closed = 0;
  escapeListener(() => closed++)({ key: "Escape" });

  assert.equal(closed, 1);
});

test("no other key does", () => {
  let closed = 0;
  const listener = escapeListener(() => closed++);
  for (const key of ["Enter", "Esc", "escape", "Tab", "e", " "]) {
    listener({ key });
  }

  assert.equal(closed, 0);
});

/** Does the component call `useEscapeKey(...)`, and import it? */
function wiresUpEscape(path) {
  const file = new URL(path, import.meta.url).pathname;
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  let imported = false;
  let called = false;
  ts.forEachChild(source, function visit(node) {
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier.getText().includes("hooks/useEscapeKey")
    ) {
      imported = true;
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.getText() === "useEscapeKey"
    ) {
      called = true;
    }
    ts.forEachChild(node, visit);
  });

  return imported && called;
}

test("Upravit člena týmu listens for ESC", () => {
  assert.ok(wiresUpEscape("../components/admin/TeamSection.tsx"));
});

test("Upravit třídu listens for ESC", () => {
  assert.ok(wiresUpEscape("../components/admin/EditClassroomModal.tsx"));
});

test("the shared Dialog keeps listening through the same hook", () => {
  assert.ok(wiresUpEscape("../components/ui/Dialog.tsx"));
});
