// node:test suite for school-roster.ts (BR-9Z59Z9). Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  classTeacherOptions,
  classroomCandidates,
  classroomsOf,
  teacherCandidates,
  teacherRemoval,
  withId,
  withoutId,
} from "./school-roster.ts";

const kavci = { id: 1, name: "ZŠ Kavčí hory" };
const komenskeho = { id: 2, name: "ZŠ Komenského" };
const cesta = { id: 3, name: "ZŠ Čáslavská" };

const member = (id, name, role = "teacher", schools = []) => ({
  id,
  name,
  email: `${id}@skola.cz`,
  role,
  schools,
});

test("only teachers not yet at the school are offered, by Czech name order", () => {
  const team = [
    member(1, "Zdeněk"),
    member(2, "Čestmír"),
    member(3, "Marek", "teacher", [kavci]),
    member(4, "Admin Adam", "admin"),
    member(5, "Bohdana", "teacher", [komenskeho]),
  ];

  assert.deepEqual(
    teacherCandidates(team, [3]).map((m) => m.name),
    ["Bohdana", "Čestmír", "Zdeněk"]
  );
});

test("a new class offers only the picked school's teachers (BR-35BPD3)", () => {
  const team = [
    member(1, "Marek", "teacher", [kavci]),
    member(2, "Bohdana", "teacher", [komenskeho]),
    member(3, "Jana", "teacher", [kavci, komenskeho]),
    member(4, "Zdeněk"),
    member(5, "Bára Adminová", "admin", [kavci]),
    member(6, "Admin Adam", "admin"),
  ];

  assert.deepEqual(
    classTeacherOptions(team, kavci.id).map((m) => m.name),
    ["Marek", "Jana", "Bára Adminová"]
  );
  assert.deepEqual(classTeacherOptions(team, cesta.id), []);
});

test("a new class without a school still offers the whole team", () => {
  const team = [member(1, "Marek", "teacher", [kavci]), member(4, "Zdeněk")];

  assert.equal(classTeacherOptions(team, null), team);
});

test("the school's classes are its own and nobody else's", () => {
  const classes = [
    { id: 1, name: "7.B", school: kavci },
    { id: 2, name: "6.A", school: komenskeho },
    { id: 3, name: "5.A", school: null },
    { id: 4, name: "6.C", school: kavci },
  ];

  assert.deepEqual(classroomsOf(classes, kavci.id).map((c) => c.name), ["6.C", "7.B"]);
});

test("class names sort by grade number, not character by character", () => {
  const classes = [
    { id: 1, name: "10.A", school: kavci },
    { id: 2, name: "9.B", school: kavci },
    { id: 3, name: "1.A", school: kavci },
  ];

  assert.deepEqual(classroomsOf(classes, kavci.id).map((c) => c.name), ["1.A", "9.B", "10.A"]);
});

test("unfiled classes are offered first, other schools' after them", () => {
  const classes = [
    { id: 1, name: "7.B", school: kavci },
    { id: 2, name: "6.A", school: komenskeho },
    { id: 3, name: "8.A", school: null },
    { id: 4, name: "5.A" },
    { id: 5, name: "4.D", school: cesta },
  ];

  assert.deepEqual(
    classroomCandidates(classes, kavci.id).map((c) => c.name),
    ["5.A", "8.A", "4.D", "6.A"]
  );
});

test("id helpers never duplicate and never touch other ids", () => {
  assert.deepEqual(withId([1, 2], 3), [1, 2, 3]);
  assert.deepEqual(withId([1, 2], 2), [1, 2]);
  assert.deepEqual(withoutId([1, 2, 3], 2), [1, 3]);
  assert.deepEqual(withoutId([1, 3], 2), [1, 3]);
});

test("removing a teacher demotes them to an ordinary user", () => {
  const removal = teacherRemoval(member(1, "Marek Učitel"), []);

  assert.equal(removal.kind, "demote");
  assert.match(removal.prompt, /Odebrat učitele Marek Učitel\?/);
  assert.match(removal.prompt, /běžného uživatele \(žáka\)/);
  assert.doesNotMatch(removal.prompt, /i na škol/);
});

test("the prompt names the other schools a demoted teacher leaves", () => {
  assert.match(
    teacherRemoval(member(1, "Marek"), [komenskeho]).prompt,
    /zmizí i ze školy ZŠ Komenského\./
  );
  assert.match(
    teacherRemoval(member(1, "Marek"), [komenskeho, cesta]).prompt,
    /zmizí i ze škol ZŠ Čáslavská, ZŠ Komenského\./
  );
});

test("an admin filed under the school is only taken off it, never demoted", () => {
  const removal = teacherRemoval(member(4, "Bára Adminová", "admin"), [komenskeho]);

  assert.equal(removal.kind, "unfile");
  assert.match(removal.prompt, /Přístup do administrace zůstane/);
});

test("prompts never guess the person's gender", () => {
  // "jeho/její", "mu/jí", "přišel/přišla" would all be a guess from a name.
  const gendered = /\b(jeho|její|mu|jí|přijde|přestane být učitelem)\b/i;
  for (const removal of [
    teacherRemoval(member(1, "Jana Dvojitá"), [komenskeho]),
    teacherRemoval(member(4, "Bára Adminová", "admin"), []),
  ]) {
    assert.doesNotMatch(removal.prompt, gendered);
  }
});
