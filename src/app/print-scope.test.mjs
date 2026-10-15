// node:test suite for the print markers that globals.css acts on (BR-B9SHDN).
// Run with `npm test`.
//
// `[data-print-hide]` is `display: none !important` in print, which removes the
// whole subtree — nothing inside it can be shown again. So a printable element
// (`data-print-title`, `data-print-table`) must never sit inside a hidden one,
// and the buttons that start printing must not end up on the paper.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const SRC = new URL("..", import.meta.url).pathname;
const PRINTABLE = ["data-print-title", "data-print-table"];

function tsxFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

function attributeNames(node) {
  const attributes = ts.isJsxElement(node)
    ? node.openingElement.attributes
    : node.attributes;
  return attributes.properties
    .filter(ts.isJsxAttribute)
    .map((attribute) => attribute.name.getText());
}

// Every JSX element in a file, with whether it or an enclosing element is
// marked data-print-hide.
function printMarkers(path) {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found = [];
  const visit = (node, hidden) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const names = attributeNames(node);
      hidden = hidden || names.includes("data-print-hide");
      const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      found.push({ node, names, hidden, where: `${path.slice(SRC.length)}:${line}` });
    }
    ts.forEachChild(node, (child) => visit(child, hidden));
  };
  visit(source, false);
  return found;
}

const markers = tsxFiles(SRC)
  .filter((path) => readFileSync(path, "utf8").includes("data-print-"))
  .flatMap(printMarkers);

test("the classroom student table is marked printable", () => {
  const tables = markers.filter(
    (m) =>
      m.where.startsWith("components/admin/ClassroomSection.tsx") &&
      m.names.includes("data-print-table"),
  );
  assert.equal(tables.length, 1);
});

test("nothing printable sits inside a data-print-hide element", () => {
  const swallowed = markers
    .filter((m) => m.hidden && PRINTABLE.some((p) => m.names.includes(p)))
    .map((m) => m.where);
  assert.deepEqual(swallowed, []);
});

test("buttons that call window.print() stay off the paper", () => {
  const printButtons = markers.filter((m) => {
    const opening = ts.isJsxElement(m.node) ? m.node.openingElement : m.node;
    return opening.attributes.properties.some(
      (a) =>
        ts.isJsxAttribute(a) &&
        a.name.getText() === "onClick" &&
        a.initializer?.getText().includes("window.print()"),
    );
  });
  assert.ok(printButtons.length > 0);
  assert.deepEqual(
    printButtons.filter((m) => !m.hidden).map((m) => m.where),
    [],
  );
});
