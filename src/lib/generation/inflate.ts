// AI Course Assistant (BR-D4PE8R) — turn an API draft into real Block V2 objects.
//
// The API never invents ids, GPF vectors or FSRS parameters; this module adds
// them from the same factories the manual editor uses, so a generated block is
// indistinguishable from a hand-made one.

import type {
  BlockStep,
  BlockV2,
  CourseV2,
  LessonV2,
  QuestionConfig,
  QuestionOption,
} from "@/types/block-v2";
import type { CourseDraft, DraftBlock, DraftQuestion, DraftStep } from "@/types/generation";
import {
  createBlockV2,
  createLessonBlockBinding,
  createLessonV2,
  generateId,
} from "@/lib/defaults";

export interface InflatedDraft {
  lessons: LessonV2[];
  blocks: BlockV2[];
}

/**
 * Build a Block V2 fragment from a draft, ready to append to `course`.
 *
 * `course` is only read — to continue lesson ordering and to keep generated
 * block ids clear of the ones already in use.
 */
export function inflateDraft(draft: CourseDraft, course: CourseV2 | null): InflatedDraft {
  const usedIds = new Set((course?.blocks ?? []).map((b) => b.block_id));
  const startOrder = (course?.lessons?.length ?? 0) + 1;

  const lessons: LessonV2[] = [];
  const blocks: BlockV2[] = [];

  draft.lessons.forEach((draftLesson, lessonIndex) => {
    const bindings = draftLesson.blocks.map((draftBlock, blockIndex) => {
      const blockId = uniqueBlockId(usedIds);
      usedIds.add(blockId);

      blocks.push(inflateBlock(draftBlock, blockId));

      return createLessonBlockBinding(blockId, blockIndex + 1);
    });

    lessons.push(
      createLessonV2(startOrder + lessonIndex, {
        name: draftLesson.name,
        description: draftLesson.description ?? "",
        blocks: bindings,
      })
    );
  });

  return { lessons, blocks };
}

/**
 * Generated ids are prefixed so an author can tell at a glance which blocks came
 * from the assistant — and so they cannot collide with existing ones.
 */
function uniqueBlockId(used: Set<string>): string {
  let id = `AI_${generateId()}`;
  while (used.has(id)) {
    id = `AI_${generateId()}`;
  }
  return id;
}

function inflateBlock(draft: DraftBlock, blockId: string): BlockV2 {
  const steps = draft.steps.map((step, index) => inflateStep(step, index));

  const block = createBlockV2({
    block_id: blockId,
    type: draft.type,
    steps,
  });

  return {
    ...block,
    learning: {
      ...block.learning,
      concepts: draft.concepts ?? [],
      difficulty: clamp(draft.difficulty, 1, 5) as BlockV2["learning"]["difficulty"],
      bloom_level: clamp(draft.bloom_level, 1, 6) as BlockV2["learning"]["bloom_level"],
    },
    // Question and exercise blocks are what spaced repetition is for; display
    // blocks stay out of the practice queue unless an author opts them in.
    default_practice: draft.type !== "display",
  };
}

function inflateStep(draft: DraftStep, index: number): BlockStep {
  const step: BlockStep = {
    id: `s${index + 1}`,
    type: draft.type,
    order: index + 1,
    content: draft.content,
  };

  if (draft.hint) step.hint = draft.hint;
  if (draft.help) step.help = draft.help;

  if (draft.type === "question" && draft.question) {
    step.question = inflateQuestion(draft.question);
  }

  return step;
}

function inflateQuestion(draft: DraftQuestion): QuestionConfig {
  const question: QuestionConfig = { type: draft.type };

  if (draft.solution) {
    question.solution = draft.solution;
    question.show_solution = true;
  }

  if (draft.type === "multiple_choice" || draft.type === "true_false") {
    question.options = (draft.options ?? []).map<QuestionOption>((option) => ({
      id: option.id,
      text: option.text,
      is_correct: option.is_correct,
      ...(option.feedback ? { feedback: option.feedback } : {}),
    }));
    question.show_answers = true;
    // Multiple correct answers are legitimate; let the config match the data.
    question.allow_multiple = question.options.filter((o) => o.is_correct).length > 1;
    return question;
  }

  if (draft.type === "numeric") {
    question.correct_number = draft.correct_number;
    question.tolerance = draft.tolerance ?? 0;
    return question;
  }

  question.correct_answer = draft.correct_answer ?? "";
  return question;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Drop everything the author unticked in the preview step.
 *
 * `selection` holds the keys of blocks to keep, formatted `${lessonIndex}:${blockIndex}`.
 * A lesson whose blocks are all unticked disappears with them.
 */
export function filterDraft(draft: CourseDraft, selection: Set<string>): CourseDraft {
  const lessons = draft.lessons
    .map((lesson, lessonIndex) => ({
      ...lesson,
      blocks: lesson.blocks.filter((_, blockIndex) =>
        selection.has(draftKey(lessonIndex, blockIndex))
      ),
    }))
    .filter((lesson) => lesson.blocks.length > 0);

  return { lessons };
}

export function draftKey(lessonIndex: number, blockIndex: number): string {
  return `${lessonIndex}:${blockIndex}`;
}

/** Every block key in a draft — the preview starts with everything ticked. */
export function allDraftKeys(draft: CourseDraft): Set<string> {
  const keys = new Set<string>();
  draft.lessons.forEach((lesson, lessonIndex) => {
    lesson.blocks.forEach((_, blockIndex) => keys.add(draftKey(lessonIndex, blockIndex)));
  });
  return keys;
}

/** Short human label for a block in the preview list. */
export function draftBlockLabel(block: DraftBlock): string {
  const firstText = block.steps.find((s) => s.content.trim() !== "");
  const raw = firstText?.content ?? "(prázdný blok)";
  const stripped = raw
    .replace(/^#+\s*/gm, "")
    .replace(/[*_`]/g, "")
    .trim()
    .split("\n")[0];

  return stripped.length > 90 ? `${stripped.slice(0, 90)}…` : stripped;
}
