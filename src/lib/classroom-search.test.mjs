// node:test suite for classroom-search.ts (BR-8BBW5W). Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";

import { matchesClassroom, searchKey, searchWords } from "./classroom-search.ts";

const dukelskych = { id: 1, name: "ZŠ Dukelských hrdinů, KV" };
const petrkove = { id: 2, name: "ZŠ Milady Petrkové, VT" };

const fuksova = { id: 10, name: "Hana Fuksová" };
const dockalova = { id: 11, name: "Hana Dočkalová" };

const b8 = { name: "8.B", school: dukelskych, teachers: [fuksova] };
const a8 = { name: "8.A", school: dukelskych, teachers: [fuksova, dockalova] };
const b8other = { name: "8.B", school: petrkove, teachers: [dockalova] };
const unfiled = { name: "Testovací třída", school: null };

test("the key is lower-case and accent-free", () => {
  assert.equal(searchKey("Hana Dočkalová"), "hana dockalova");
  assert.equal(searchKey("  ZŠ Čáslavská "), "zs caslavska");
  assert.deepEqual(searchWords("  Fuksová   Hana "), ["fuksova", "hana"]);
  assert.deepEqual(searchWords("   "), []);
});

// The report: typing a teacher's name found no class at all.
test("a class is found by its teacher, typed without diacritics", () => {
  assert.equal(matchesClassroom(b8, "fuksova"), true);
  assert.equal(matchesClassroom(b8, "Fuksová"), true);
  assert.equal(matchesClassroom(b8, "FUKSOVA"), true);
  assert.equal(matchesClassroom(b8, "dockalova"), false);
  assert.equal(matchesClassroom(a8, "dockalova"), true);
});

test("the teacher's name matches whichever way round it is typed", () => {
  assert.equal(matchesClassroom(b8, "Hana Fuksová"), true);
  assert.equal(matchesClassroom(b8, "Fuksová Hana"), true);
  assert.equal(matchesClassroom(b8, "fuksova hana"), true);
});

test("words from different fields narrow the list together", () => {
  assert.equal(matchesClassroom(b8, "8.b fuksova"), true);
  assert.equal(matchesClassroom(b8other, "8.b fuksova"), false);
  assert.equal(matchesClassroom(b8, "dukelskych fuksova"), true);
  assert.equal(matchesClassroom(b8other, "petrkove dockalova"), true);
});

test("class name and school still match on their own", () => {
  assert.equal(matchesClassroom(b8, "8.b"), true);
  assert.equal(matchesClassroom(b8, "dukelskych"), true);
  assert.equal(matchesClassroom(b8, "9.a"), false);
  assert.equal(matchesClassroom(unfiled, "testovaci"), true);
});

test("a class without a teacher never matches a teacher's name", () => {
  assert.equal(matchesClassroom(unfiled, "fuksova"), false);
  assert.equal(matchesClassroom({ name: "6.C", teachers: [] }, "fuksova"), false);
});

test("an empty query lets every class through", () => {
  assert.equal(matchesClassroom(b8, ""), true);
  assert.equal(matchesClassroom(unfiled, "   "), true);
});
