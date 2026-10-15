// V2 Block Import System Types
// Based on Global Proficiency Framework (GPF) and FSRS spaced repetition

// ============================================================================
// Status and Type Enums
// ============================================================================

export type BlockStatus = "draft" | "locked" | "approved" | "published" | "private";
export type BlockType = "display" | "question" | "exercise";

// ============================================================================
// Step Types (for multi-step blocks)
// ============================================================================

export type StepType = "text" | "image" | "video" | "audio" | "question";

export interface BlockStep {
  id: string;              // "s1", "s2", "s3"...
  type: StepType;
  order: number;
  content?: string;        // text steps
  image?: StepImage;       // image steps
  video?: StepVideo;       // video steps
  audio?: StepAudio;       // audio steps
  question?: QuestionConfig; // question steps
  hint?: string;           // Short hint shown on ? click
  help?: string;           // Detailed help/explanation
  default_practice?: boolean; // Display blocks: include this step in practice queue
}
export type BloomLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;
export type GPFLevel = 1 | 2 | 3 | 4; // below, partially, meet, exceed

export type OutputFormat = "plain_text" | "html_text" | "markdown" | JsonOutputFormat;

// Export types for different content packages
// Course = complete course with all content
// Exercise = practice with hints (currently called Quiz in app)
// Quiz = test without hints/solutions, with grading ("mark": "5")
export type ExportTypeV2 = "course_v2" | "exercise_v2" | "quiz_v2";

export interface JsonOutputFormat {
  type: "json";
  schema: Record<string, string>;
}

// ============================================================================
// Image Types
// ============================================================================

export interface HeaderImage {
  url: string;
  alt?: string;
}

export interface StepImage {
  url: string;
  alt?: string;
  position?: "above" | "below" | "inline";
}

export interface StepVideo {
  url: string;           // Direct MP4 video URL
  position?: "above" | "below" | "inline";
}

export interface StepAudio {
  url: string;           // Direct audio URL (MP3, WAV, etc.)
}

// ============================================================================
// Question Types (Multiple Choice, True/False, Open)
// ============================================================================

export type QuestionType = "open" | "multiple_choice" | "true_false" | "numeric";

export interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
  feedback?: string;  // Shown after selection (supports markdown/LaTeX)
  feedback_image?: StepImage; // Optional image in feedback
  mark?: string;      // Grade/mark for Quiz mode (e.g., "1", "2", "3", "4", "5")
  score_koef?: number; // Score coefficient (0-1)
  go_to?: string;     // Navigation target per option (NEXT_STEP, AGAIN, END, step ID, or cross-course ref)
}

/**
 * One rubric line for an AI-evaluated open question (BR-P745Q8).
 *
 * Criteria sit *on top of* the expected answer, they do not replace it: the
 * expected answer stays the primary reference and criteria say what the
 * feedback must walk through. Capped at four in the editor — past that the
 * feedback stops being short, which the brief asks for explicitly.
 */
export interface QuestionCriterion {
  id: string;           // Stable across edits; the AI echoes it back on scores
  name: string;         // e.g. "Odolnost lesa"
  description: string;  // What the student has to demonstrate
  weight: number;       // 0-100, relative importance
}

export interface QuestionConfig {
  type: QuestionType;
  options?: QuestionOption[];     // For multiple_choice AND true_false
  correct_answer?: string;        // For open questions: what the AI grades against, and the offline comparison (one accepted answer per line). Never shown to the student
  allow_photo?: boolean;         // For open questions: allow student to answer with a photo
  allow_multiple?: boolean;       // Allow selecting multiple options
  show_answers?: boolean;         // MCQ: show answer options to user (default true)
  correct_number?: number;        // Expected numeric answer (for numeric questions)
  tolerance?: number;             // Acceptable ± tolerance for numeric questions (default 0)
  show_solution?: boolean;        // Whether to show solution after answering (default true)
  solution?: string;              // Solution explanation shown after answering (supports markdown/LaTeX)
  solution_image?: StepImage;     // Optional image in solution
  ai_evaluation?: boolean;        // Open questions: show the AI's feedback. Grading is always AI (BR-N26ACB); off = right/wrong + solution
  /**
   * @deprecated BR-FFVVYR's free-text criteria. Still read by the evaluator so
   * courses authored before the structured editor keep behaving the same —
   * write `ai_criteria_list` instead.
   */
  ai_criteria?: string;
  ai_criteria_list?: QuestionCriterion[];  // Max 4 (BR-P745Q8)
  /**
   * AI-guided solving (BR-V9TQA7). Withholds `solution` while the student still
   * has attempts left: they get the formative feedback, the answer field stays
   * open, and the block waits. The explanation appears once they get there or
   * once the last attempt is spent.
   *
   * Only meaningful together with `ai_evaluation` — without feedback there is
   * nothing to retry against. Ignored in quiz mode, which allows one attempt.
   */
  ai_guided?: boolean;
  ai_guided_attempts?: number;    // Attempts before the solution is revealed (default 3)
  // Tri-state: undefined = inherit CourseV2.shuffle_answers, true/false = override it.
  // Never write `false` when the author means "inherit" — that would pin the
  // question against a later course-level change.
  shuffle_options?: boolean;      // Randomize option order each time the question is shown
}

// ============================================================================
// Course V2 (Top-level container)
// ============================================================================

export interface CourseV2 {
  export_type: ExportTypeV2;
  course_id: string;
  /**
   * Shared identity of this course's translation group (BR-AYACEK). Language
   * variants each keep their own `course_id` but share this key, and the API
   * refuses to save a variant whose structure diverges from its siblings.
   * Omitted means "this course is its own group of one".
   */
  translation_key?: string;
  version: number;
  name: string;
  description: string;
  language: string;
  author: string;
  updated: string;
  status: BlockStatus;
  pin?: string;                // 6-digit access code for the course
  starts_with_quiz?: boolean;  // Course begins with a diagnostic quiz
  only_once?: boolean;         // One-time course, student can't return after completion
  logged_only?: boolean;       // Only authenticated users can access this course
  quiz_evaluate?: boolean;     // Show correct/incorrect feedback and score in quiz mode
  open_all_lessons?: boolean;  // All lessons unlocked — student picks any order
  only_quiz?: boolean;         // Course runs only as a quiz — no lessons
  shuffle_answers?: boolean;   // Default for every question: randomize option order (per-question shuffle_options overrides)
  /**
   * Which attempt at an open question counts toward course progress (BR-P745Q8).
   *
   * Default "last": the most recent evaluated attempt, which is what a student
   * working through feedback expects to see reflected. "best" suits a course
   * where retrying is part of the design and the earlier attempt should not
   * drag the result down.
   */
  open_answer_score?: "last" | "best";
  max_xp?: number;             // Maximum XP earnable from this course (hard cap)
  header_image?: HeaderImage;  // Course header/cover image
  ai_context?: string;         // Didactic notes & common-mistake solutions for the AI tutor
  stop_gambling?: boolean;     // Detect & stop rapid, random click-through of answers
  stop_notice?: string;        // Message shown to students on gambling detection; empty → system default
  lessons: LessonV2[];
  // Optional: embedded blocks for self-contained export
  blocks?: BlockV2[];
}

// ============================================================================
// Lesson V2 (Lesson container with block bindings)
// ============================================================================

export interface LessonV2 {
  lesson_id: string;
  version: number;
  name: string;
  description: string;
  order: number;
  header_image?: HeaderImage;  // Lesson header/cover image
  ai_context?: string;         // Didactic notes & common-mistake solutions for the AI tutor
  blocks: LessonBlockBinding[];
}

export interface LessonBlockBinding {
  block_id: string;           // Reference to BlockV2
  order: number;              // Position in lesson
  bg_image?: string;          // Visual override
  bg_color?: string;          // Visual override
  default_practice?: boolean;  // Deprecated — use BlockV2.default_practice instead
}

// ============================================================================
// Block V2 (Complete block definition)
// ============================================================================

export interface BlockV2 {
  export_type: "block_v2";

  // Identification
  block_id: string;
  version: number;
  language: string;
  author: string;
  updated: string;
  status: BlockStatus;
  type: BlockType;  // "display" or "question"
  duration: string;
  xp?: number;      // Experience points awarded for completing this block
  default_practice?: boolean;  // Question/exercise blocks: auto-add to practice/spaced repetition queue

  // Didactics - GPF
  gpf: GPFData;

  // Didactics - Learning
  learning: LearningMetadata;

  // Adaptation & FSRS (optional, with defaults)
  fsrs?: FSRSParameters;
  adaptation?: AdaptationRules;

  // Steps - ordered array of step content (new multi-step format)
  steps?: BlockStep[];

  // Content - legacy flat fields (deprecated, use steps[] instead)
  content?: string;           // Markdown/HTML content (question text for question blocks)
  image?: StepImage;          // Optional image
  video?: StepVideo;          // Optional video (direct MP4 URL)

  // Question configuration - legacy (deprecated, use question step in steps[] instead)
  question?: QuestionConfig;  // Answer options/logic (the content field holds the question text)
  hint?: string;              // Short hint shown on ? click
  help?: string;              // Detailed help/explanation
}

// ============================================================================
// GPF (Global Proficiency Framework) Data
// ============================================================================

export interface GPFData {
  domain: string;           // "Number and operation", "Algebra", etc.
  construct: string;        // "N2 FRACTIONS"
  subconstruct: string;     // "N2.3 Solve real-world problems..."
  grade: number | null;     // 1-10 or null
  level: GPFLevel;          // below/partially/meet/exceed
  vector?: number[];        // GPF taxonomy vector
  kb_vector?: number[];     // Knowledge base vector
  relation_vector?: number[]; // 35-element ELO relation vector (0=none, 1=weak, 2=strong)
  elo_vector?: number[];      // 35-element ELO difficulty vector (1.0–10.0)
}

// ============================================================================
// Learning Metadata
// ============================================================================

export interface LearningMetadata {
  concepts: string[];                    // ["Zlomky", "Smisena cisla"]
  competencies: Record<string, number>;  // { "M.4.5.7": 50, "M.6.7.4": 30 }
  bloom_level: BloomLevel;
  difficulty: DifficultyLevel;
  prerequisites: PrerequisiteRule[];
  d_data?: Record<string, unknown>;      // R&D variable data
  l_data?: Record<string, unknown>;      // FSRS/gamification signals
}

export interface PrerequisiteRule {
  block_id?: string;        // Required block
  skill?: string;           // Required skill (e.g., "ALG_3.1.2")
  min_level: number;        // Minimum mastery (0-1)
  weight?: number;          // Weight in readiness calculation
}

// ============================================================================
// FSRS (Free Spaced Repetition Scheduler) Parameters
// ============================================================================

export interface FSRSParameters {
  initial_difficulty: number;   // D0 (default: 0.3)
  initial_stability: number;    // S0 (default: 2.5)
  initial_recall: number;       // R0 (default: 0.65)
  forgetting_rate: number;      // lambda (default: 0.25)
  repetitions: number;          // Display count (default: 0)
  weight: number;               // Block weight (default: 5.0, per FSRS spec)
  min_interval: number;         // Min days (default: 1)
  max_interval: number;         // Max days (default: 90)
  skip_condition?: string;      // e.g., "GPF_mastery > 0.8"
  time_limit_sec?: number;      // Optional time limit
}

// ============================================================================
// Adaptation Rules
// ============================================================================

export interface AdaptationRules {
  scaffolded?: string;    // Condition, e.g., "avg_relevant_score < 3"
  full?: string;          // Condition, e.g., "avg_relevant_score >= 3"
}

// ============================================================================
// AI Mode (for AI-powered content/evaluation)
// ============================================================================

export interface AIMode {
  model: string;
  prompt: string;
}

// ============================================================================
// Evaluation Rules (for question validation)
// ============================================================================

export type EvaluationType = "exact_match" | "contains" | "regex" | "numeric_range";

export interface EvaluationRules {
  type: EvaluationType;
  accepted_answers?: string[];
  pattern?: string;
  min?: number;
  max?: number;
}

// ============================================================================
// Analytics Event (Future ready)
// ============================================================================

export interface AnalyticsEvent {
  timestamp_start: string;
  timestamp_answer?: string;
  timestamp_leave: string;
  delta_sec?: number;         // Time between question and answer
  time_spent?: number;        // Total time in block
  used_help?: 1 | 2 | 3;      // 1=hint, 2=help, 3=AI
  user_feedback?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

// Matches any V2 package type (course, exercise, quiz)
export function isV2Package(data: unknown): data is CourseV2 {
  if (typeof data !== "object" || data === null || !("export_type" in data)) {
    return false;
  }
  const exportType = (data as { export_type: string }).export_type;
  return ["course_v2", "exercise_v2", "quiz_v2"].includes(exportType);
}

// Specifically matches course_v2 export type
export function isCourseV2(data: unknown): data is CourseV2 {
  return (
    typeof data === "object" &&
    data !== null &&
    "export_type" in data &&
    (data as CourseV2).export_type === "course_v2"
  );
}

// Matches quiz_v2 export type
export function isQuizV2(data: unknown): data is CourseV2 {
  return (
    typeof data === "object" &&
    data !== null &&
    "export_type" in data &&
    (data as CourseV2).export_type === "quiz_v2"
  );
}

// Matches exercise_v2 export type
export function isExerciseV2(data: unknown): data is CourseV2 {
  return (
    typeof data === "object" &&
    data !== null &&
    "export_type" in data &&
    (data as CourseV2).export_type === "exercise_v2"
  );
}

export function isBlockV2(data: unknown): data is BlockV2 {
  return (
    typeof data === "object" &&
    data !== null &&
    "export_type" in data &&
    (data as BlockV2).export_type === "block_v2"
  );
}

export function isLegacyV2Block(data: unknown): data is BlockV2 {
  // Also detect blocks by block_id presence (for legacy format)
  return (
    typeof data === "object" &&
    data !== null &&
    "block_id" in data &&
    !("export_type" in data && (data as { export_type: string }).export_type === "course")
  );
}
