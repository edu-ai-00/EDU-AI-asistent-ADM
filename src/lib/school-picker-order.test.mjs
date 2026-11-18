// node:test suite for school-picker-order.ts (BR-Z5N45R). Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";

import { assignedFirst, unassignedGroupStart } from "./school-picker-order.ts";

const testovaci = { id: 1, name: "Testovací škola - produkce" };
const mimon = { id: 2, name: "ZŠ a MŠ Mimoň" };
const buzulucka = { id: 3, name: "ZŠ Buzulucká, Teplice" };
const chomutov = { id: 4, name: "ZŠ Chomutov" };
const caslavska = { id: 5, name: "ZŠ Čáslavská" };

const all = [testovaci, mimon, buzulucka, chomutov, caslavska];

// The report: the checked school sat far down the alphabet, below the fold of
// a scroll box that shows four rows.
test("the assigned schools come first, each group by name", () => {
  assert.deepEqual(assignedFirst(all, new Set([4, 5])), [
    caslavska,
    chomutov,
    testovaci,
    mimon,
    buzulucka,
  ]);
});

test("with nothing assigned the list stays plain alphabetical", () => {
  assert.deepEqual(assignedFirst(all, new Set()), [
    testovaci,
    mimon,
    buzulucka,
    caslavska,
    chomutov,
  ]);
});

test("with everything assigned the list stays plain alphabetical", () => {
  assert.deepEqual(assignedFirst(all, new Set([1, 2, 3, 4, 5])), [
    testovaci,
    mimon,
    buzulucka,
    caslavska,
    chomutov,
  ]);
});

test("an assigned id matching no school changes nothing", () => {
  assert.deepEqual(assignedFirst(all, new Set([999])), assignedFirst(all, new Set()));
});

// Czech sorts Č right after C and the digraph Ch only after H, so Čáslavská
// comes before Chomutov — the opposite of a plain code-point sort.
test("names sort the Czech way, not by code point", () => {
  assert.deepEqual(assignedFirst([chomutov, caslavska], new Set()), [caslavska, chomutov]);
});

test("the schools the hook handed over are left untouched", () => {
  const schools = [chomutov, testovaci];
  assignedFirst(schools, new Set([1]));
  assert.deepEqual(schools, [chomutov, testovaci]);
});

test("no schools, no rows", () => {
  assert.deepEqual(assignedFirst([], new Set([1])), []);
});

test("the line falls where the assigned group ends", () => {
  const assigned = new Set([4, 5]);
  assert.equal(unassignedGroupStart(assignedFirst(all, assigned), assigned), 2);
});

test("nothing assigned and nothing left over draw no line", () => {
  assert.equal(unassignedGroupStart(assignedFirst(all, new Set()), new Set()), -1);
  const everything = new Set([1, 2, 3, 4, 5]);
  assert.equal(unassignedGroupStart(assignedFirst(all, everything), everything), -1);
  assert.equal(unassignedGroupStart([], new Set()), -1);
});
