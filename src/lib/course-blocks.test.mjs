// node:test suite for course-blocks.ts (BR-XU4Y5K, BR-FQDZ5U). Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";

import { lessonBlockUsage, removeLesson, uniqueCourseBlocks } from "./course-blocks.ts";

const block = (block_id, content = "text") => ({ block_id, type: "display", content });
const ids = (course) => course.blocks.map((b) => b.block_id);

test("a block listed twice is kept once, in its first position", () => {
  // A2-Rovnice_c1: a lesson's blocks appended to `blocks` a second time.
  const course = {
    lessons: [],
    blocks: [block("A1"), block("R2_01"), block("R2_02"), block("R2_01"), block("R2_02"), block("U1")],
  };
  assert.deepEqual(ids(uniqueCourseBlocks(course)), ["A1", "R2_01", "R2_02", "U1"]);
});

test("the first copy wins when duplicates disagree, as in the app", () => {
  const course = { lessons: [], blocks: [block("B1", "first"), block("B1", "second")] };
  const result = uniqueCourseBlocks(course);
  assert.equal(result.blocks.length, 1);
  assert.equal(result.blocks[0].content, "first");
});

test("a course without duplicates comes back as the same object", () => {
  const course = { lessons: [], blocks: [block("B1"), block("B2")] };
  assert.equal(uniqueCourseBlocks(course), course);
  const noBlocks = { lessons: [] };
  assert.equal(uniqueCourseBlocks(noBlocks), noBlocks);
});

// Deleting a lesson (BR-FQDZ5U): its blocks used to stay in `blocks` and show up
// under Unassigned. A block another lesson still binds must survive either way.
const lesson = (lesson_id, ...blockIds) => ({
  lesson_id,
  name: lesson_id,
  order: 1,
  blocks: blockIds.map((block_id, i) => ({ block_id, order: i + 1 })),
});
const ratios = () => ({
  lessons: [lesson("Pokus", "P1", "P2", "S1"), lesson("Úměra", "S1", "U1")],
  blocks: [block("P1"), block("S1"), block("P2"), block("U1"), block("ORPHAN")],
});

test("a lesson's own blocks are the ones no other lesson binds", () => {
  assert.deepEqual(lessonBlockUsage(ratios(), "Pokus"), { own: ["P1", "P2"], shared: ["S1"] });
  assert.deepEqual(lessonBlockUsage(ratios(), "Úměra"), { own: ["U1"], shared: ["S1"] });
  assert.deepEqual(lessonBlockUsage(ratios(), "missing"), { own: [], shared: [] });
});

test("a block bound twice in the lesson counts once; a binding to a missing block is skipped", () => {
  const course = { lessons: [lesson("L", "B1", "B1", "GONE")], blocks: [block("B1")] };
  assert.deepEqual(lessonBlockUsage(course, "L"), { own: ["B1"], shared: [] });
});

test("deleting a lesson with its blocks drops only the blocks no other lesson uses", () => {
  const result = removeLesson(ratios(), "Pokus", { withBlocks: true });
  assert.deepEqual(result.lessons.map((l) => l.lesson_id), ["Úměra"]);
  assert.deepEqual(ids(result), ["S1", "U1", "ORPHAN"]);
});

test("deleting only the lesson keeps every block, as before", () => {
  const course = ratios();
  const result = removeLesson(course, "Pokus", { withBlocks: false });
  assert.deepEqual(result.lessons.map((l) => l.lesson_id), ["Úměra"]);
  assert.equal(result.blocks, course.blocks);
});

test("the other lessons are left untouched", () => {
  const course = ratios();
  const result = removeLesson(course, "Pokus", { withBlocks: true });
  assert.equal(result.lessons[0], course.lessons[1]);
});
