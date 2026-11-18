// node:test suite for step-answers.ts (BR-PW5EQK). Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";

import { getStepAnswers } from "./step-answers.ts";

const block = (stepAnswers) => ({
  blockId: "B1",
  currentStepIndex: 0,
  stepAnswers,
  isBlockCompleted: false,
  bestScoreKoef: 0,
  earnedXp: 0,
});

test("an answer typed but not checked yet is not an answer", () => {
  const sp = block({ s1: { textAnswer: "Rozepsaná odpověď", isAnswered: false } });
  assert.equal(getStepAnswers(sp), null);
});

test("a checked answer counts, its unchecked sibling does not", () => {
  const sp = block({
    s1: { selectedOptionId: "b", isAnswered: true, isCorrect: true },
    s2: { textAnswer: "zatím", isAnswered: false },
  });
  assert.deepEqual(Object.keys(getStepAnswers(sp)), ["s1"]);
});

test("answers saved before the flag existed still count", () => {
  const sp = block({ s1: { selectedOptionId: "a", isCorrect: false } });
  assert.deepEqual(Object.keys(getStepAnswers(sp)), ["s1"]);
});

test("no answers, or the PHP empty-array shape, is null", () => {
  assert.equal(getStepAnswers(block({})), null);
  assert.equal(getStepAnswers(block([])), null);
});
