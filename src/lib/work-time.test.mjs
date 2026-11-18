// node:test suite for work-time.ts (BR-3VDABQ). Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";

import { formatDuration, userTotalSeconds } from "./work-time.ts";

const user = ({ courses = [], quizzes = [], lessons = [] } = {}) => ({
  courses: courses.map((s) => ({ time_spent_seconds: s })),
  quiz_attempts: quizzes.map((s) => ({ time_spent_seconds: s })),
  progress: lessons.map((s) => ({ time_spent_seconds: s })),
});

test("the work-time total wins over the quiz-only progress timers", () => {
  // The reported case: 14 min of lesson work, a sub-minute quiz. The header
  // read "0m" while Čas práce read 14 min.
  assert.equal(userTotalSeconds(user({ courses: [40], quizzes: [40] }), 14 * 60), 14 * 60);
});

test("the header and the Čas práce tab show the same total", () => {
  const work = 14 * 60 + 40;
  assert.equal(formatDuration(userTotalSeconds(user({ quizzes: [40] }), work)), formatDuration(work));
  assert.equal(formatDuration(work), "15 min");
});

test("no recorded work time falls back to the progress timers", () => {
  assert.equal(userTotalSeconds(user({ quizzes: [120], lessons: [60] }), 0), 180);
  assert.equal(userTotalSeconds(user({ quizzes: [120] }), undefined), 120);
  // The course cache mirrors quiz time, so the larger of the two is taken.
  assert.equal(userTotalSeconds(user({ courses: [300], quizzes: [120] }), 0), 300);
});

test("nothing recorded anywhere is zero", () => {
  assert.equal(userTotalSeconds(user(), undefined), 0);
  assert.equal(userTotalSeconds({ courses: [], quiz_attempts: null, progress: undefined }, 0), 0);
});

test("durations read as seconds, minutes, then hours", () => {
  assert.equal(formatDuration(0), "0 s");
  assert.equal(formatDuration(40), "40 s");
  assert.equal(formatDuration(60), "1 min");
  assert.equal(formatDuration(3600 + 23 * 60), "1 h 23 min");
});
