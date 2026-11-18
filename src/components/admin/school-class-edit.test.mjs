// node:test suite for the class pencil in the "Upravit školu" dialog
// (BR-H7WZJ5). Run with `npm test`.
//
// The pencil used to open a rename field for the class name and nothing
// else; it has to open the whole class instead, in a new tab, on Učitelé.
// SchoolSection.tsx is a client component, so it is read as source: the
// RowActions of the class list and the pencil RowActions itself render.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const PATH = new URL("./SchoolSection.tsx", import.meta.url).pathname;
const text = readFileSync(PATH, "utf8");
const source = ts.createSourceFile(PATH, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function declaration(name) {
  let found;
  ts.forEachChild(source, function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.getText() === name) found = node;
    ts.forEachChild(node, visit);
  });
  assert.ok(found, `${name} not found in SchoolSection.tsx`);
  return found;
}

// Every <Tag …> and <Tag … /> under `root`, as their opening elements.
function elements(root, tag) {
  const found = [];
  ts.forEachChild(root, function visit(node) {
    if (
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
      node.tagName.getText() === tag
    ) {
      found.push(node);
    }
    ts.forEachChild(node, visit);
  });
  return found;
}

function attribute(element, name) {
  const found = element.attributes.properties.find(
    (p) => ts.isJsxAttribute(p) && p.name.getText() === name,
  );
  if (!found) return undefined;
  const value = found.initializer;
  if (!value) return true;
  if (ts.isStringLiteral(value)) return value.text;
  return value.expression.getText();
}

const classList = declaration("SchoolClassrooms");
const rowActions = elements(classList, "RowActions");

test("the class list has exactly one pencil, and it links out", () => {
  assert.equal(rowActions.length, 1);
  assert.equal(
    attribute(rowActions[0], "editHref"),
    'classroomHref(c.id, "teachers")',
    "the class pencil no longer points at the class detail's Učitelé tab",
  );
  assert.equal(
    attribute(rowActions[0], "onEdit"),
    undefined,
    "the class pencil still edits in place",
  );
});

test("the pencil opens the class in a new tab", () => {
  const links = elements(declaration("RowActions"), "Link");
  assert.equal(links.length, 1, "RowActions should render one link, the pencil's");
  assert.equal(attribute(links[0], "href"), "editHref");
  assert.equal(attribute(links[0], "target"), "_blank");
  assert.match(attribute(links[0], "rel") ?? "", /noopener/);
});

test("renaming the class in the school dialog is gone", () => {
  assert.ok(
    !classList.getText().includes("updateClassroom"),
    "SchoolClassrooms still writes the class name itself",
  );
  assert.ok(
    !text.includes("useUpdateClassroom"),
    "the rename hook is still imported into the school dialog",
  );
});
