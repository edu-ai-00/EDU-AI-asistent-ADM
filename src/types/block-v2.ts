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

export interface QuestionConfig {
  type: QuestionType;
  options?: QuestionOption[];     // For multiple_choice AND true_false
  correct_answer?: string;        // For open questions
  allow_multiple?: boolean;       // Allow selecting multiple options
  show_answers?: boolean;         // MCQ: show answer options to user (default true)
  correct_number?: number;        // Expected numeric answer (for numeric questions)
  tolerance?: number;             // Acceptable ± tolerance for numeric questions (default 0)
  show_solution?: boolean;        // Whether to show solution after answering (default true)
  solution?: string;              // Solution explanation shown after answering (supports markdown/LaTeX)
  solution_image?: StepImage;     // Optional image in solution
}

// ============================================================================
// Course V2 (Top-level container)
// ============================================================================

export interface CourseV2 {
  export_type: ExportTypeV2;
  course_id: string;
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
  only_quiz?: boolean;         // Course runs only as a quiz — no lessons
  max_xp?: number;             // Maximum XP earnable from this course (hard cap)
  header_image?: HeaderImage;  // Course header/cover image
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
  default_practice?: boolean;  // Exercise only: auto-add to practice/spaced repetition queue

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
  video?: StepVideo;          // Optional YouTube video

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
  weight: number;               // Block weight (default: 1.0)
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
