// node:test suite for the class delete confirmation (BR-3CN3QN). Run with
// `npm test`.
//
// "Smazat" in the class detail deleted the class on the first click, with no
// question asked, although the delete is irreversible and erases the pupil
// accounts minted for the class. The prompt must name the class and its
// pupils, and the button must ask it before the delete is sent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import ts from "typescript";

// classroom-delete.ts imports through the `@/` path alias, which only Next
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

const { classroomDeletePrompt } = await import("./classroom-delete.ts");

test("the prompt names the class and counts its pupils", () => {
  const prompt = classroomDeletePrompt({ name: "TEST Claude T125 smazat", studentCount: 2 });

  assert.match(prompt, /^Opravdu chcete smazat třídu „TEST Claude T125 smazat“ \(2 žáci\)\?/);
  assert.match(prompt, /Účty žáků založené pro tuto třídu budou i s celou historií nevratně odstraněny\./);
  assert.match(prompt, /Žáci s vlastním účtem nebo zapsaní i v jiné třídě zůstanou/);
  assert.match(prompt, /Tuto akci nelze vrátit zpět\.$/);
});

test("the pupil count is declined in Czech", () => {
  const count = (n) =>
    classroomDeletePrompt({ name: "8.B", studentCount: n }).match(/\((\d+ \S+)\)/)[1];

  assert.equal(count(1), "1 žák");
  assert.equal(count(3), "3 žáci");
  assert.equal(count(5), "5 žáků");
  assert.equal(count(22), "22 žáků");
});

test("an empty class says so instead of warning about pupil accounts", () => {
  assert.equal(
    classroomDeletePrompt({ name: "8.B", studentCount: 0 }),
    "Opravdu chcete smazat třídu „8.B“? Třída nemá žádné žáky. Tuto akci nelze vrátit zpět."
  );
});

// ClassroomSection.tsx is a client component, so it is read as source.
const PATH = new URL("../components/admin/ClassroomSection.tsx", import.meta.url).pathname;
const source = ts.createSourceFile(
  PATH,
  readFileSync(PATH, "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

function functionNamed(name) {
  let found;
  ts.forEachChild(source, function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.getText() === name) found = node;
    ts.forEachChild(node, visit);
  });
  assert.ok(found, `${name} not found in ClassroomSection.tsx`);
  return found;
}

test("Smazat asks before it deletes the class", () => {
  const body = functionNamed("handleDelete").body.getText();
  const asks = body.indexOf("if (!confirm(deletePrompt)) return;");
  const deletes = body.indexOf("deleteMutation.mutate(");

  assert.notEqual(asks, -1, "handleDelete must confirm with the class prompt");
  assert.notEqual(deletes, -1, "handleDelete must still delete the class");
  assert.ok(asks < deletes, "the question comes before the delete");
});

test("the prompt is built from the class detail", () => {
  const detail = functionNamed("ClassroomDetail").body.getText();
  assert.match(
    detail,
    /const deletePrompt = classroomDeletePrompt\(\{\s*name: classroom\.name,\s*studentCount: students\.length,\s*\}\);/
  );
});
