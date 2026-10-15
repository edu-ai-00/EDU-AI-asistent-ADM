// node:test suite for course-blocks.ts (BR-XU4Y5K). Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";

import { uniqueCourseBlocks } from "./course-blocks.ts";

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
