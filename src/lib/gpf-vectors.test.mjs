// node:test suite for gpf-vectors.ts (BR-S9SVNM). Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  GPF_VECTOR_LENGTH,
  dimensionsBySlot,
  gpfSlotNumber,
  validateBlockGpfVectors,
  validateCourseGpfVectors,
} from "./gpf-vectors.ts";

const relation = (overrides = {}) => {
  const v = new Array(GPF_VECTOR_LENGTH).fill(0);
  for (const [i, value] of Object.entries(overrides)) v[Number(i)] = value;
  return v;
};
const elo = (overrides = {}) => {
  const v = new Array(GPF_VECTOR_LENGTH).fill(5);
  for (const [i, value] of Object.entries(overrides)) v[Number(i)] = value;
  return v;
};
const block = (gpf) => ({ block_id: "B1", gpf });

test("a block with valid vectors has no issues", () => {
  assert.deepEqual(
    validateBlockGpfVectors(block({ relation_vector: relation({ 3: 2, 4: 1 }), elo_vector: elo({ 0: 0, 1: 10 }) })),
    [],
  );
});

test("a display-only block without vectors (or with empty ones) is not an error", () => {
  assert.deepEqual(validateBlockGpfVectors(block({ domain: "Algebra" })), []);
  assert.deepEqual(validateBlockGpfVectors(block({ relation_vector: [], elo_vector: [] })), []);
  assert.deepEqual(validateBlockGpfVectors(block(undefined)), []);
});

test("a relation value other than exactly 0, 1 or 2 is reported with its slot", () => {
  const issues = validateBlockGpfVectors(
    block({ relation_vector: relation({ 3: 1.5, 7: 3, 9: -1, 11: "dva", 12: null }), elo_vector: elo() }),
  );
  assert.equal(issues.length, 1);
  assert.equal(issues[0].field, "relation_vector");
  assert.equal(issues[0].blockId, "B1");
  assert.match(issues[0].message, /\[3\] = 1\.5/);
  assert.match(issues[0].message, /\[7\] = 3/);
  assert.match(issues[0].message, /\[9\] = -1/);
  assert.match(issues[0].message, /\[11\] = "dva"/);
  assert.match(issues[0].message, /\[12\] = null/);
});

test("numeric strings are the numbers the app reads them as (BR-6DRK92)", () => {
  // A34-Funkce_05 as stored: every slot of both vectors is a string.
  const asStrings = (v) => v.map(String);
  assert.deepEqual(
    validateBlockGpfVectors(
      block({
        relation_vector: asStrings(relation({ 31: 1, 34: 2 })),
        elo_vector: asStrings(new Array(GPF_VECTOR_LENGTH).fill(0).map((_, i) => (i === 31 ? 7 : i === 34 ? 8 : 0))),
      }),
    ),
    [],
  );
  // Out-of-range values stay out of range when spelled as strings.
  const issues = validateBlockGpfVectors(
    block({ relation_vector: relation({ 0: "3" }), elo_vector: elo({ 0: "10.5", 1: "0x5" }) }),
  );
  assert.deepEqual(issues.map((i) => i.field), ["relation_vector", "elo_vector"]);
  assert.match(issues[0].message, /\[0\] = "3"/);
  assert.match(issues[1].message, /\[0\] = "10\.5"/);
  assert.match(issues[1].message, /\[1\] = "0x5"/);
});

test("gpfSlotNumber parses a slot the way the app does", () => {
  assert.equal(gpfSlotNumber(2), 2);
  assert.equal(gpfSlotNumber(7.5), 7.5);
  assert.equal(gpfSlotNumber("2"), 2);
  assert.equal(gpfSlotNumber(" 7.5 "), 7.5);
  assert.equal(gpfSlotNumber("8.0"), 8);
  for (const bad of [null, undefined, "", "  ", "dva", "0x5", "1,5", "1e400", true, [2], NaN, Infinity]) {
    assert.equal(gpfSlotNumber(bad), undefined, `gpfSlotNumber(${JSON.stringify(bad)})`);
  }
});

test("dimension labels sit on the slot their dimension_index names (BR-6DRK92)", () => {
  // The A34 course's vector: 0–34 with no dimension 9, so its 34 labels do
  // not line up with the 35 slots by position.
  const labels = [
    { index: 0, code: "N1.1" },
    { index: 8, code: "N3.2" },
    { index: 10, code: "N3.4" },
    { index: 33, code: "A3.3" },
    { index: 34, code: "A3.4" },
  ];
  const bySlot = dimensionsBySlot(labels);
  assert.equal(bySlot.get(0)?.code, "N1.1");
  assert.equal(bySlot.get(8)?.code, "N3.2");
  assert.equal(bySlot.get(9), undefined);
  assert.equal(bySlot.get(10)?.code, "N3.4");
  assert.equal(bySlot.get(33)?.code, "A3.3");
  assert.equal(bySlot.get(34)?.code, "A3.4");
  assert.equal(dimensionsBySlot(undefined).size, 0);
});

test("an elo rating outside 0–10 is reported, null stays allowed", () => {
  const issues = validateBlockGpfVectors(
    block({ relation_vector: relation(), elo_vector: elo({ 0: 10.5, 1: -0.1, 2: null }) }),
  );
  assert.equal(issues.length, 1);
  assert.equal(issues[0].field, "elo_vector");
  assert.match(issues[0].message, /\[0\] = 10\.5/);
  assert.match(issues[0].message, /\[1\] = -0\.1/);
  assert.doesNotMatch(issues[0].message, /\[2\]/);
});

test("a vector that is not exactly 35 slots long is reported", () => {
  const issues = validateBlockGpfVectors(
    block({ relation_vector: [0, 2, 1], elo_vector: new Array(40).fill(5) }),
  );
  assert.deepEqual(
    issues.map((i) => i.field),
    ["relation_vector", "elo_vector"],
  );
  assert.match(issues[0].message, /má 3 prvků/);
  assert.match(issues[1].message, /má 40 prvků/);
});

test("a hole in an editor array is caught before it is saved as null", () => {
  const sparse = [];
  sparse[GPF_VECTOR_LENGTH - 1] = 2;
  const issues = validateBlockGpfVectors(block({ relation_vector: sparse, elo_vector: elo() }));
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /\[0\] = prázdné/);
});

test("a non-array vector is reported", () => {
  const issues = validateBlockGpfVectors(block({ relation_vector: "0,1,2", elo_vector: elo() }));
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /není pole/);
});

test("long lists of bad slots are summarised", () => {
  const issues = validateBlockGpfVectors(
    block({ relation_vector: new Array(GPF_VECTOR_LENGTH).fill(0.5), elo_vector: elo() }),
  );
  assert.match(issues[0].message, /a dalších 30/);
});

test("course validation walks every block and names the lesson that binds it", () => {
  const course = {
    lessons: [
      { name: "Zlomky", blocks: [{ block_id: "OK", order: 1 }, { block_id: "BAD", order: 2 }] },
    ],
    blocks: [
      { block_id: "OK", gpf: { relation_vector: relation({ 0: 2 }), elo_vector: elo() } },
      { block_id: "BAD", gpf: { relation_vector: relation({ 0: 1.5 }), elo_vector: elo() } },
      { block_id: "ORPHAN", gpf: { relation_vector: relation(), elo_vector: elo({ 5: 11 }) } },
    ],
  };
  const issues = validateCourseGpfVectors(course);
  assert.deepEqual(
    issues.map((i) => [i.blockId, i.lessonName, i.field]),
    [
      ["BAD", "Zlomky", "relation_vector"],
      ["ORPHAN", undefined, "elo_vector"],
    ],
  );
});

test("a course without blocks has no issues", () => {
  assert.deepEqual(validateCourseGpfVectors({ lessons: [] }), []);
});
