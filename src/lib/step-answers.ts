import type { BlockStepProgress, StepAnswer } from "@/types/api";

/**
 * The answers a pupil has actually submitted in one block, or null when there
 * are none.
 *
 * The app saves an answer that is typed or picked but not checked yet too,
 * with `isAnswered: false`, so a lesson reopened later still has it
 * (BR-PW5EQK). That is a draft, not an answer: counted here it would show up
 * as answered — and as "Špatně", having no verdict. Answers saved before the
 * flag existed lack it and still count.
 */
export function getStepAnswers(
  sp: BlockStepProgress,
): Record<string, StepAnswer> | null {
  if (!sp.stepAnswers || Array.isArray(sp.stepAnswers)) return null;
  const entries = Object.entries(sp.stepAnswers as Record<string, StepAnswer>)
    .filter(([, answer]) => answer?.isAnswered !== false);
  if (entries.length === 0) return null;
  return Object.fromEntries(entries);
}
