// node:test suite for user-school-classes.ts (BR-QKCBCT). Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ELSEWHERE_GROUP,
  UNFILED_GROUP,
  classGroups,
  matchesQuery,
  pickableSchools,
  schoolIdsOfClasses,
  toggleId,
} from "./user-school-classes.ts";

const komenskeho = { id: 1, name: "ZŠ Komenského", identifier: "600012345" };
const palackeho = { id: 2, name: "ZŠ Palackého", identifier: null };
const caslavska = { id: 3, name: "ZŠ Čáslavská", identifier: null };
const schools = [komenskeho, palackeho, caslavska];

const k9a = { id: 11, name: "9.A", school: komenskeho };
const k10a = { id: 12, name: "10.A", school: komenskeho };
const k6b = { id: 13, name: "6.B", school: komenskeho };
const p7c = { id: 21, name: "7.C", school: palackeho };
const c8a = { id: 31, name: "8.A", school: caslavska };
const unfiled = { id: 41, name: "Testovací třída", school: null };
const classes = [p7c, k10a, unfiled, k9a, c8a, k6b];

const names = (group) => group.classes.map((c) => c.name);

test("search ignores case and Czech accents", () => {
  assert.equal(matchesQuery("ZŠ Čáslavská", "caslav"), true);
  assert.equal(matchesQuery("ZŠ Čáslavská", "ČÁSL"), true);
  assert.equal(matchesQuery("ZŠ Palackého", "caslav"), false);
  assert.equal(matchesQuery("cokoliv", "   "), true);
});

test("schools are filtered by name or identifier", () => {
  assert.deepEqual(pickableSchools(schools, "palack").map((s) => s.id), [2]);
  assert.deepEqual(pickableSchools(schools, "600012").map((s) => s.id), [1]);
  assert.deepEqual(pickableSchools(schools, "").map((s) => s.id), [3, 1, 2]);
});

test("toggling adds a missing id and removes a present one", () => {
  assert.deepEqual(toggleId([1, 2], 3), [1, 2, 3]);
  assert.deepEqual(toggleId([1, 2, 3], 2), [1, 3]);
});

test("a student's schools are the schools of their classes, once each", () => {
  assert.deepEqual(schoolIdsOfClasses(classes, [11, 12, 21, 41]).sort(), [1, 2]);
  assert.deepEqual(schoolIdsOfClasses(classes, [41]), []);
  // A class this editor cannot see (another teacher's) contributes nothing.
  assert.deepEqual(schoolIdsOfClasses(classes, [999]), []);
});

test("step two lists only the picked schools' classes, school by school", () => {
  const groups = classGroups({ classes, schools, schoolIds: [2, 1], assignedIds: [], query: "" });

  assert.deepEqual(
    groups.map((g) => g.title),
    ["ZŠ Komenského", "ZŠ Palackého", "Bez školy"]
  );
  // Natural order, so 10.A comes after 9.A.
  assert.deepEqual(names(groups[0]), ["6.B", "9.A", "10.A"]);
  assert.deepEqual(names(groups[1]), ["7.C"]);
  assert.equal(groups.some((g) => g.classes.some((c) => c.id === c8a.id)), false);
});

test("classes filed under no school are always offered", () => {
  const groups = classGroups({ classes, schools, schoolIds: [], assignedIds: [], query: "" });

  assert.deepEqual(groups.map((g) => g.key), [UNFILED_GROUP]);
  assert.deepEqual(names(groups[0]), ["Testovací třída"]);
});

test("a class kept from an unpicked school stays listed until unticked", () => {
  const groups = classGroups({ classes, schools, schoolIds: [2], assignedIds: [21, 31, 11], query: "" });
  const elsewhere = groups.find((g) => g.key === ELSEWHERE_GROUP);

  assert.ok(elsewhere);
  assert.deepEqual(names(elsewhere), ["8.A", "9.A"]);
  assert.deepEqual(
    elsewhere.classes.map((c) => c.school?.name),
    ["ZŠ Čáslavská", "ZŠ Komenského"]
  );
  // 7.C belongs to a picked school, so it is listed there, not twice.
  assert.equal(groups.filter((g) => g.classes.some((c) => c.id === 21)).length, 1);
});

test("a picked school with no class shows up empty rather than vanishing", () => {
  const empty = { id: 4, name: "ZŠ Nová", identifier: null };
  const groups = classGroups({
    classes,
    schools: [...schools, empty],
    schoolIds: [4],
    assignedIds: [],
    query: "",
  });

  assert.deepEqual(groups[0], { key: "school-4", title: "ZŠ Nová", classes: [] });
});

test("the class search narrows by class or school name and drops empty groups", () => {
  const byClass = classGroups({ classes, schools, schoolIds: [1, 2], assignedIds: [], query: "9.a" });
  assert.deepEqual(byClass.map((g) => g.title), ["ZŠ Komenského"]);
  assert.deepEqual(names(byClass[0]), ["9.A"]);

  const bySchool = classGroups({ classes, schools, schoolIds: [1, 2], assignedIds: [], query: "palackeho" });
  assert.deepEqual(bySchool.map((g) => g.title), ["ZŠ Palackého"]);

  assert.deepEqual(
    classGroups({ classes, schools, schoolIds: [1], assignedIds: [], query: "nic takového" }),
    []
  );
});
