// node:test suite for which menu group each Navbar item sits in (BR-HABQT7).
// Run with `npm test`.
//
// Navbar.tsx is a client component, so it is read as source: every
// `const x: NavItem[] = [...]` list and the `navGroups` that name them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const PATH = new URL("./Navbar.tsx", import.meta.url).pathname;
const source = ts.createSourceFile(
  PATH,
  readFileSync(PATH, "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

function property(object, name) {
  const found = object.properties.find(
    (p) => ts.isPropertyAssignment(p) && p.name.getText() === name,
  );
  return found?.initializer;
}

function literal(node) {
  if (!node) return undefined;
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  return node.getText();
}

const lists = new Map();
ts.forEachChild(source, function visit(node) {
  if (
    ts.isVariableDeclaration(node) &&
    node.initializer &&
    ts.isArrayLiteralExpression(node.initializer)
  ) {
    lists.set(
      node.name.getText(),
      node.initializer.elements.filter(ts.isObjectLiteralExpression),
    );
  }
  ts.forEachChild(node, visit);
});

// Group label → the items in it, as { href, label, roles }.
const groups = new Map(
  lists.get("navGroups").map((group) => [
    literal(property(group, "label")),
    lists.get(property(group, "items").getText()).map((item) => ({
      href: literal(property(item, "href")),
      label: literal(property(item, "label")),
      roles: literal(property(item, "roles")),
    })),
  ]),
);

const SCHOOLS = "/admin/users?tab=schools";

test("Školy sit under Správa, not under Škola (BR-HABQT7)", () => {
  assert.ok(
    groups.get("Správa").some((item) => item.href === SCHOOLS),
    "Školy missing from Správa",
  );
  for (const [label, items] of groups) {
    if (label === "Správa") continue;
    assert.ok(
      !items.some((item) => item.href === SCHOOLS),
      `Školy still listed under ${label}`,
    );
  }
});

test("Školy stay admin-only after the move", () => {
  const schools = groups.get("Správa").find((item) => item.href === SCHOOLS);
  assert.deepEqual(schools.roles, ["admin"]);
});

test("every other /admin/users tab keeps its group", () => {
  const hrefs = (label) => groups.get(label).map((item) => item.href);
  assert.ok(hrefs("Správa").includes("/admin/users?tab=admins"));
  for (const href of [
    "/admin/users",
    "/admin/users?tab=classrooms",
    "/admin/users?tab=teachers",
    "/admin/users?tab=activity",
  ]) {
    assert.ok(hrefs("Škola").includes(href), `${href} left Škola`);
  }
});
