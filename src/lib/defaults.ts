// V2 Default Values and Factory Functions

import type {
  BlockV2,
  BlockStep,
  CourseV2,
  LessonV2,
  LessonBlockBinding,
  GPFData,
  LearningMetadata,
  FSRSParameters,
  BlockStatus,
  BlockType,
  StepType,
  ExportTypeV2,
  QuestionType,
  QuestionConfig,
} from "@/types/block-v2";

// ============================================================================
// FSRS Default Values
// ============================================================================

export const DEFAULT_FSRS: FSRSParameters = {
  initial_difficulty: 0.3,
  initial_stability: 2.5,
  initial_recall: 0.65,
  forgetting_rate: 0.25,
  repetitions: 0,
  weight: 1.0,
  min_interval: 1,
  max_interval: 90,
};

// ============================================================================
// GPF Default Values
// ============================================================================

export const DEFAULT_GPF: GPFData = {
  domain: "",
  construct: "",
  subconstruct: "",
  grade: null,
  level: 2,
  vector: [],
  kb_vector: [],
};

// ============================================================================
// Learning Metadata Defaults
// ============================================================================

export const DEFAULT_LEARNING: LearningMetadata = {
  concepts: [],
  competencies: {},
  bloom_level: 3,
  difficulty: 3,
  prerequisites: [],
};

// ============================================================================
// Question Config Defaults
// ============================================================================

export const DEFAULT_QUESTION_CONFIG: QuestionConfig = {
  type: "multiple_choice",
  options: [],
  show_answers: true,
};

// ============================================================================
// Factory Functions
// ============================================================================

export function generateId(): string {
  return Math.random().toString(36).substring(2, 12).toUpperCase();
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

export function generateStepId(existingSteps: Pick<BlockStep, "id">[]): string {
  let maxNum = 0;
  for (const step of existingSteps) {
    const match = step.id.match(/^s(\d+)$/);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
  }
  return `s${maxNum + 1}`;
}

export function createBlockStep(type: StepType, existingSteps: Pick<BlockStep, "id">[]): BlockStep {
  const id = generateStepId(existingSteps);
  const order = existingSteps.length + 1;
  const step: BlockStep = { id, type, order };

  switch (type) {
    case "text":
      step.content = "";
      break;
    case "image":
      step.image = { url: "" };
      break;
    case "video":
      step.video = { url: "" };
      break;
    case "audio":
      step.audio = { url: "" };
      break;
    case "question":
      step.question = { ...DEFAULT_QUESTION_CONFIG, options: [] };
      break;
  }

  return step;
}

export function duplicateBlockV2(block: BlockV2): BlockV2 {
  const newSteps = block.steps?.map((step, i) => ({
    ...structuredClone(step),
    id: `s${i + 1}`,
  })) ?? [];
  return {
    ...structuredClone(block),
    block_id: generateId(),
    steps: newSteps,
    updated: getCurrentTimestamp(),
  };
}

export function duplicateStep(step: BlockStep, existingSteps: Pick<BlockStep, "id">[]): BlockStep {
  return { ...structuredClone(step), id: generateStepId(existingSteps) };
}

export function createBlockV2(overrides: Partial<BlockV2> = {}): BlockV2 {
  const type = overrides.type || "display";

  // Build default steps based on type
  const defaultSteps: BlockStep[] = [];
  if (!overrides.steps) {
    if (type === "display") {
      defaultSteps.push(createBlockStep("text", []));
    } else if (type === "question" || type === "exercise") {
      defaultSteps.push(createBlockStep("text", []));
      defaultSteps.push(createBlockStep("question", [{ id: "s1" }]));
    }
  }

  return {
    export_type: "block_v2",
    block_id: generateId(),
    version: 1,
    language: "cs",
    author: "",
    updated: getCurrentTimestamp(),
    status: "draft",
    type,
    duration: "5 min",
    xp: 10,
    gpf: { ...DEFAULT_GPF },
    learning: { ...DEFAULT_LEARNING, concepts: [], competencies: {}, prerequisites: [] },
    fsrs: { ...DEFAULT_FSRS },
    steps: defaultSteps,
    ...overrides,
  };
}

export function createDisplayBlock(overrides: Partial<BlockV2> = {}): BlockV2 {
  return createBlockV2({
    type: "display",
    content: "",
    ...overrides,
  });
}

export function createQuestionBlock(overrides: Partial<BlockV2> = {}): BlockV2 {
  return createBlockV2({
    type: "question",
    question: {
      type: "multiple_choice",
      options: [
        { id: "a", text: "Option A", is_correct: true },
        { id: "b", text: "Option B", is_correct: false },
      ],
      show_answers: true,
    },
    ...overrides,
  });
}

export function createExerciseBlock(overrides: Partial<BlockV2> = {}): BlockV2 {
  return createBlockV2({
    type: "exercise",
    ...overrides,
  });
}

export function createLessonV2(order: number, overrides: Partial<LessonV2> = {}): LessonV2 {
  return {
    lesson_id: generateId(),
    version: 1,
    name: "New Lesson",
    description: "",
    order,
    blocks: [],
    ...overrides,
  };
}

export function createLessonBlockBinding(
  blockId: string,
  order: number,
  overrides: Partial<LessonBlockBinding> = {}
): LessonBlockBinding {
  return {
    block_id: blockId,
    order,
    ...overrides,
  };
}

export function createCourseV2(overrides: Partial<CourseV2> = {}): CourseV2 {
  return {
    export_type: "course_v2",
    course_id: generateId(),
    version: 1,
    name: "New Course V2",
    description: "",
    language: "cs",
    author: "",
    updated: getCurrentTimestamp(),
    status: "draft",
    lessons: [],
    blocks: [],
    ...overrides,
  };
}

// ============================================================================
// Status Labels (for UI)
// ============================================================================

export const STATUS_LABELS: Record<BlockStatus, string> = {
  draft: "Draft",
  private: "Private",
  locked: "Locked",
  approved: "Approved",
  published: "Published",
};

export const STATUS_COLORS: Record<BlockStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  private: "bg-purple-100 text-purple-800",
  locked: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  published: "bg-green-100 text-green-800",
};

// ============================================================================
// Block Type Labels (for UI)
// ============================================================================

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  display: "Display (Zobrazení)",
  question: "Question (Otázka)",
  exercise: "Exercise (Procvičování)",
};

// ============================================================================
// Step Type Labels & Config
// ============================================================================

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  text: "Text",
  image: "Image (Obrázek)",
  video: "Video",
  audio: "Audio",
  question: "Question (Otázka)",
};

export const ALLOWED_STEP_TYPES: Record<BlockType, StepType[]> = {
  display: ["text", "image", "video", "audio"],
  question: ["text", "image", "video", "audio", "question"],
  exercise: ["text", "image", "video", "audio", "question"],
};

// ============================================================================
// Bloom's Taxonomy Labels
// ============================================================================

export const BLOOM_LABELS: Record<number, string> = {
  1: "1 - Remember (Zapamatovat)",
  2: "2 - Understand (Porozumet)",
  3: "3 - Apply (Aplikovat)",
  4: "4 - Analyze (Analyzovat)",
  5: "5 - Evaluate (Hodnotit)",
  6: "6 - Create (Tvorit)",
};

// ============================================================================
// GPF Level Labels
// ============================================================================

export const GPF_LEVEL_LABELS: Record<number, string> = {
  1: "1 - Below (Pod urovni)",
  2: "2 - Partially (Castecne)",
  3: "3 - Meets (Splnuje)",
  4: "4 - Exceeds (Prevysuje)",
};

// ============================================================================
// Output Format Labels
// ============================================================================

export const OUTPUT_FORMAT_LABELS: Record<string, string> = {
  plain_text: "Plain Text",
  html_text: "HTML",
  markdown: "Markdown (with LaTeX)",
  json: "JSON Schema",
};

// ============================================================================
// Question Type Labels
// ============================================================================

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  open: "Open Answer (Otevrena odpoved)",
  multiple_choice: "Multiple Choice (Vyber z moznosti)",
  true_false: "True/False (Ano/Ne)",
  numeric: "Numeric (Číselná odpověď)",
};

// ============================================================================
// Export Type Labels
// ============================================================================

export const EXPORT_TYPE_LABELS: Record<ExportTypeV2, string> = {
  course_v2: "Course (Kurz)",
  exercise_v2: "Exercise (Procvičování)",
  quiz_v2: "Quiz (Test)",
};

// Descriptions for export types
export const EXPORT_TYPE_DESCRIPTIONS: Record<ExportTypeV2, string> = {
  course_v2: "Kompletní kurz se všemi bloky a lekcemi",
  exercise_v2: "Procvičování s nápovědou a řešením (aktuálně Kvíz v aplikaci)",
  quiz_v2: "Test bez nápovědy a řešení, s hodnocením známkou",
};

// ============================================================================
// Image Position Labels
// ============================================================================

export const IMAGE_POSITION_LABELS: Record<string, string> = {
  above: "Above Content",
  below: "Below Content",
  inline: "Inline with Content",
};

// ============================================================================
// Migration: Flat fields → Steps
// ============================================================================

export function migrateBlockToSteps(block: BlockV2): BlockV2 {
  // Already has steps — skip
  if (block.steps && block.steps.length > 0) return block;

  const steps: BlockStep[] = [];
  let order = 0;

  // Migrate content → text step
  if (block.content && block.content.trim() !== "") {
    order++;
    steps.push({ id: `s${order}`, type: "text", order, content: block.content });
  }

  // Migrate image → image step
  if (block.image?.url) {
    order++;
    steps.push({ id: `s${order}`, type: "image", order, image: block.image });
  }

  // Migrate video → video step
  if (block.video?.url) {
    order++;
    steps.push({ id: `s${order}`, type: "video", order, video: block.video });
  }

  // Migrate question → question step
  if (block.question) {
    order++;
    steps.push({ id: `s${order}`, type: "question", order, question: block.question });
  }

  // If no content at all, give display blocks a default text step
  if (steps.length === 0 && block.type === "display") {
    steps.push({ id: "s1", type: "text", order: 1, content: "" });
  }
  // Question/exercise blocks with no content get text + question steps
  if (steps.length === 0 && (block.type === "question" || block.type === "exercise")) {
    steps.push({ id: "s1", type: "text", order: 1, content: "" });
    steps.push({ id: "s2", type: "question", order: 2, question: { ...DEFAULT_QUESTION_CONFIG, options: [] } });
  }

  return { ...block, steps };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeImportedBlock(raw: any): BlockV2 {
  const partial = { ...raw };

  // Convert gpf_vector dot-separated string → vector number array
  if (partial.gpf && typeof partial.gpf.gpf_vector === "string") {
    partial.gpf = {
      ...partial.gpf,
      vector: partial.gpf.gpf_vector.split(".").map(Number),
    };
    delete partial.gpf.gpf_vector;
  }

  return createBlockV2(partial);
}

export function migrateCourseBlocks(course: CourseV2): CourseV2 {
  if (!course.blocks || course.blocks.length === 0) return course;
  return {
    ...course,
    blocks: course.blocks.map(migrateBlockToSteps),
  };
}

// ============================================================================
// Block Validation
// ============================================================================

export interface BlockValidationError {
  blockId: string;
  errors: string[];
}

function validateQuestionConfig(q: QuestionConfig, prefix: string): string[] {
  const errors: string[] = [];
  switch (q.type) {
    case "open":
      if (!q.correct_answer || q.correct_answer.trim() === "") {
        errors.push(`${prefix}: Otevřená otázka nemá definovanou správnou odpověď`);
      }
      break;
    case "multiple_choice":
      if (!q.options || q.options.length < 2) {
        errors.push(`${prefix}: Multiple choice musí mít alespoň 2 možnosti`);
      } else {
        if (!q.options.some(opt => opt.is_correct)) {
          errors.push(`${prefix}: Žádná správná odpověď`);
        }
        if (q.options.some(opt => !opt.text || opt.text.trim() === "")) {
          errors.push(`${prefix}: Některé možnosti mají prázdný text`);
        }
      }
      break;
    case "true_false":
      if (!q.options || q.options.length !== 2) {
        errors.push(`${prefix}: True/False musí mít přesně 2 možnosti`);
      } else if (q.options.filter(opt => opt.is_correct).length !== 1) {
        errors.push(`${prefix}: True/False musí mít právě jednu správnou odpověď`);
      }
      break;
    case "numeric":
      if (q.correct_number === undefined || q.correct_number === null) {
        errors.push(`${prefix}: Číselná otázka nemá definovanou správnou hodnotu (correct_number)`);
      }
      break;
    default:
      errors.push(`${prefix}: Neznámý typ otázky: ${q.type}`);
  }
  return errors;
}

export function validateBlockForExport(block: BlockV2): string[] {
  const errors: string[] = [];
  const steps = block.steps || [];

  // Step-based validation
  if (steps.length > 0) {
    // Display blocks need at least one text step with content
    if (block.type === "display") {
      const hasText = steps.some(s => s.type === "text" && s.content && s.content.trim() !== "");
      if (!hasText) {
        errors.push("Display block nemá žádný text step s obsahem");
      }
    }

    // Question/exercise blocks need at least one question step
    if (block.type === "question" || block.type === "exercise") {
      const questionSteps = steps.filter(s => s.type === "question");
      if (questionSteps.length === 0) {
        errors.push("Block nemá žádný question step");
      }
      for (const qs of questionSteps) {
        if (qs.question) {
          errors.push(...validateQuestionConfig(qs.question, `Step ${qs.id}`));
        } else {
          errors.push(`Step ${qs.id}: Chybí konfigurace otázky`);
        }
      }
    }

    // Check for dangling go_to references in question blocks
    // Note: go_to can reference step IDs (sN) within this block OR block_ids in the course
    if (block.type === "question") {
      const stepIds = new Set(steps.map(s => s.id));
      const specialTargets = new Set(["NEXT_STEP", "AGAIN", "END"]);
      for (const step of steps) {
        if (step.type === "question" && step.question?.options) {
          for (const opt of step.question.options) {
            if (opt.go_to && !specialTargets.has(opt.go_to) && !stepIds.has(opt.go_to)) {
              // If it looks like a step ID (sN) but doesn't exist, it's an error
              // Otherwise it's likely a cross-block reference — allow it
              if (/^s\d+$/.test(opt.go_to)) {
                errors.push(`Step ${step.id}, option "${opt.id}": go_to "${opt.go_to}" odkazuje na neexistující step`);
              }
            }
          }
        }
      }
    }

    return errors;
  }

  // Legacy flat-field validation (for blocks without steps)
  if (block.type === "display") {
    if (!block.content || block.content.trim() === "") {
      errors.push("Display block má prázdný obsah");
    }
    return errors;
  }

  if (block.type === "question" || block.type === "exercise") {
    if (!block.content || block.content.trim() === "") {
      errors.push("Block nemá text otázky (content)");
    }
    if (!block.question) {
      errors.push("Block nemá konfiguraci odpovědí");
      return errors;
    }
    errors.push(...validateQuestionConfig(block.question, "Question"));
  }

  return errors;
}

export function validateCourseForExport(course: CourseV2): BlockValidationError[] {
  const validationErrors: BlockValidationError[] = [];

  for (const block of course.blocks || []) {
    const errors = validateBlockForExport(block);
    if (errors.length > 0) {
      validationErrors.push({
        blockId: block.block_id,
        errors,
      });
    }
  }

  return validationErrors;
}
