// API Response Types for Laravel eduai-api backend
// These types match the Laravel Course model response format

import type { CourseV2 } from "./block-v2";

// ============================================================================
// Course Types (from Laravel API)
// ============================================================================

// ============================================================================
// Languages & translation groups (BR-AYACEK)
// ============================================================================

/** A language a course may be published in, from the shared catalogue. */
export interface Language {
  id: number;
  code: string;
  name: string;
  native_name: string;
  is_active: boolean;
  sort_order: number;
}

/** A sibling language variant of a course, as returned by GET /courses/{id}. */
export interface CourseTranslation {
  id: number;
  course_id: string;
  language: string;
  name: string;
  version: number;
  status: Course["status"];
  /** False when this variant's structure has drifted from the one being viewed. */
  in_sync: boolean;
}

/**
 * Returned with a 422 when an upload's structure disagrees with a sibling
 * language variant. `diff` lists the paths that diverged.
 */
export interface StructureConflict {
  translation_key: string;
  against: {
    id: number;
    course_id: string;
    language: string;
    name: string;
    version: number;
  };
  diff: string[];
}

export interface Course {
  id: number;
  course_id: string;
  /**
   * Shared identity of this course's translation group. Language variants keep
   * separate `course_id`s but share this key.
   */
  translation_key: string | null;
  /** Fingerprint of the course structure; variants in sync share it. */
  structure_hash: string | null;
  /** Sibling variants — only present on the single-course endpoint. */
  translations?: CourseTranslation[];
  code: string | null;
  pin: string | null;
  name: string;
  description: string | null;
  author: string | null;
  emoji: string | null;
  lesson_count: number | null;
  estimated_minutes: number | null;
  version: number;
  status: "draft" | "locked" | "approved" | "published" | "private";
  language: string;
  file_path: string | null;
  file_size: number | null;
  file_uploaded_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // GPF vector assignment (UUID or null)
  vector_id: string | null;
  created_by: string | null;
  // Flags extracted from CourseV2 JSON
  starts_with_quiz?: boolean;
  only_once?: boolean;
  logged_only?: boolean;
  quiz_evaluate?: boolean;
  open_all_lessons?: boolean;
  only_quiz?: boolean;
  // Aggregated stats from backend
  users_count?: number;
  completed_count?: number;
  avg_progress?: number | null;
  // Note: 'data' field is hidden in list responses, available only via download
}

// For upload response which includes full course data
export interface CourseWithData extends Course {
  data: CourseV2;
}

// Upload response from /courses/upload
export interface UploadResponse {
  message: string;
  data: Course;
  upload: {
    path: string;
    size: number;
    download_url: string;
    expires_at: string;
  };
}

// Download response from /courses/{id}/download
export interface DownloadResponse {
  course_id: string;
  version: number;
  download_url: string;
  expires_at: string;
  file_size: number;
}

// ============================================================================
// Input Types (for mutations)
// ============================================================================

// Create course via POST /courses (legacy endpoint)
export interface CreateCourseInput {
  name: string;
  course_id: string;
  version: number;
  language: string;
  status?: "draft" | "locked" | "approved" | "published" | "private";
  data: CourseV2;
}

// Update course via PUT /courses/{id}
export interface UpdateCourseInput {
  name?: string;
  course_id?: string;
  language?: string;
  status?: "draft" | "locked" | "approved" | "published" | "private";
  description?: string | null;
  author?: string | null;
  emoji?: string | null;
  data?: CourseV2;
}

// Upload course via POST /courses/upload (preferred method)
// This accepts the full CourseV2 JSON directly
export type UploadCourseInput = CourseV2;

// ============================================================================
// User Types (from Admin API)
// ============================================================================

export interface AdminUserStats {
  level: number;
  xp_points: number;
  streak_days: number;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string | null;
  role: "student" | "teacher" | "admin";
  login_code: string | null;
  avatar_index: number | null;
  selected_subjects: string[] | null;
  classroom_ids: number[];
  classrooms: { id: number; name: string }[];
  classroom_name: string | null;
  email_verified_at: string | null;
  created_at: string;
  courses_count: number;
  completed_count: number;
  last_active_at: string | null;
  stats: AdminUserStats | null;
  is_guest: boolean;
  device_id: string | null;
  /** Set while the account is switched off — no login path lets it in (BR-Q3ZJ6Q). */
  deactivated_at: string | null;
}

export interface AdminUserDetailStats extends AdminUserStats {
  achievements_count: number;
  courses_count: number;
  last_streak_date: string | null;
}

export interface StepAnswer {
  selectedOptionId: string;
  isAnswered: boolean;
  isCorrect: boolean;
  markValue?: string;
  scoreKoef: number;
}

export interface BlockStepProgress {
  blockId: string;
  currentStepIndex: number;
  stepAnswers: Record<string, StepAnswer> | unknown[];
  isBlockCompleted: boolean;
  bestScoreKoef: number;
  earnedXp: number;
  quizMark?: string;
}

export interface BlockTimestamp {
  opened_at?: string;
  confirmed_at?: string;
}

/** Per-block hint/help/assistant open tracking (BR-BBK5FP). Counts + first/last
 * are kept for summaries; the *_events arrays hold one ISO timestamp per open. */
export interface BlockHintHelpUsage {
  hint_count?: number;
  hint_first_ts?: string;
  hint_last_ts?: string;
  hint_events?: string[];
  help_count?: number;
  help_first_ts?: string;
  help_last_ts?: string;
  help_events?: string[];
  assistant_count?: number;
  assistant_first_ts?: string;
  assistant_last_ts?: string;
  assistant_events?: string[];
}

export interface CourseProgressLesson {
  lesson_id: string;
  completed_blocks?: string[];
  block_answers?: Record<string, string> | unknown[];
  block_timestamps?: Record<string, BlockTimestamp>;
  hint_help_usage?: Record<string, BlockHintHelpUsage>;
  current_block_index?: number;
  step_progress?: Record<string, BlockStepProgress>;
  is_completed: boolean;
  completed_at: string | null;
}

export interface QuizBlockAnswer {
  is_correct: boolean;
  is_answered: boolean;
  answered_at?: string;
}

export interface CourseProgressData {
  lessons: Record<string, CourseProgressLesson>;
  xp_earned?: number;
  quiz_completed?: boolean;
  quiz_score?: number;
  quiz_correct?: number;
  quiz_total?: number;
  quiz_completed_at?: string;
  quiz_answers?: Record<string, QuizBlockAnswer>;
}

export interface UserCourseInfo {
  id: number;
  course_name: string | null;
  course_id: string | null;
  only_quiz?: boolean;
  status: string | null;
  progress_percent: number | null;
  completed_lessons: number | null;
  total_lessons: number | null;
  current_lesson_index: number | null;
  time_spent_seconds: number | null;
  progress_data: CourseProgressData | null;
  downloaded_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
}

export interface UserSessionInfo {
  ip_address: string | null;
  user_agent: string | null;
  last_activity: string;
}

export interface AdminBookmark {
  id: number;
  course_id: string;
  /** Catalog name for course_id, or null when it resolves to no course —
   * e.g. a per-device local id pushed by older app builds (BR-952UKZ). */
  course_name: string | null;
  lesson_id: string;
  block_id: string;
  note: string | null;
  created_at: string;
}

/** One FSRS practice card — the user's practice deck as synced from clients.
 * state: 0=new, 1=learning, 2=review, 3=relearning. */
export interface AdminPracticeCard {
  id: number;
  course_id: string;
  course_name: string | null;
  lesson_id: string;
  block_id: string;
  source_type: string;
  state: number;
  due_date: string | null;
  reps: number;
  lapses: number;
  last_review: string | null;
  is_active: boolean;
  updated_at: string;
}

/** One FSRS practice pass-through (review) of a block (BR-DKDAPK).
 * rating: 1=Nevím, 2=Připomeň, 3=Jde to, 4=Pamatuji. */
export interface PracticeReviewLog {
  block_id: string | null;
  lesson_id: string | null;
  course_id: string | null;
  course_name: string | null;
  source_type: string | null;
  rating: number;
  response_time_sec: number | null;
  shown_at: string | null;
  reviewed_at: string | null;
}

export interface AdminUserDetail {
  id: number;
  name: string;
  email: string;
  role: "student" | "teacher" | "admin";
  login_code: string | null;
  avatar_index: number | null;
  selected_subjects: string[] | null;
  classroom_ids: number[];
  classrooms: { id: number; name: string }[];
  classroom_name: string | null;
  /** A team member's schools (BR-R84FVD); always empty for a student. */
  school_ids?: number[];
  /** The classes a team member teaches (BR-QKCBCT); always empty for a student. */
  teaching_classroom_ids?: number[];
  email_verified_at: string | null;
  created_at: string;
  is_guest: boolean;
  device_id: string | null;
  deactivated_at: string | null;
  /** Who switched it off, from the audit trail; null when unknown or active. */
  deactivated_by: { id: number; name: string } | null;
  stats: AdminUserDetailStats | null;
  courses: UserCourseInfo[];
  sessions: UserSessionInfo[];
  progress?: UserProgress[];
  quiz_attempts?: QuizAttempt[];
  bookmarks?: AdminBookmark[];
  practice_cards?: AdminPracticeCard[];
  practice_reviews?: PracticeReviewLog[];
}

export interface UpdateUserInput {
  name?: string;
  email?: string | null;
  classroom_ids?: number[];
  role?: "student" | "teacher" | "admin";
  /** Admin-only; the API ignores it from a teacher and for a student. */
  school_ids?: number[];
  /**
   * The classes a team member teaches (BR-QKCBCT) — classroom_ids is where a
   * pupil sits. Admin-only; the API ignores it from a teacher and for a student.
   */
  teaching_classroom_ids?: number[];
}

// ============================================================================
// Progress Types (from Admin Progress API)
// ============================================================================

export interface ProgressBlockData {
  isCompleted: boolean;
  answer?: string;
  isCorrect?: boolean;
}

export interface ProgressData {
  blocks: Record<string, ProgressBlockData>;
  step_progress?: Record<string, { currentIndex: number; completed: boolean }>;
  block_feedback?: Record<string, { isLiked: boolean; isDisliked: boolean }>;
}

export interface UserProgress {
  id: number;
  course_id: string;
  lesson_id: string;
  progress_percent: number;
  is_completed: boolean;
  last_position: number;
  time_spent_seconds: number;
  started_at: string;
  completed_at: string | null;
  progress_data: ProgressData;
  updated_at: string;
  user?: AdminUser;
}

export interface BlockStats {
  block_id: string;
  lesson_id: string;
  total_attempts: number;
  completed_count: number;
  correct_count: number;
  incorrect_count: number;
  liked_count: number;
}

export interface CourseProgressStats {
  course_id: string;
  blocks: BlockStats[];
  meta: { total_users: number; total_blocks: number };
}

// ============================================================================
// Quiz Attempt Types (from Admin Quiz API)
// ============================================================================

export interface QuizAttemptAnswer {
  question_index: number;
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  answered_at?: string;
  // Open answers graded by AI (BR-FFVVYR)
  evaluated_by_ai?: boolean;
  ai_score?: number | null;
  ai_feedback?: string | null;
  ai_model?: string | null;
}

// ============================================================================
// Open Answers (free-text answers from lessons/exercises, AI-graded)
// ============================================================================

/**
 * The three-part formative feedback a student was shown (BR-P745Q8).
 *
 * Null on rows written before this shipped, and on rows whose evaluation
 * failed — check `attempt_status` before assuming this is populated.
 */
export interface OpenAnswerFeedbackParts {
  strengths?: string | null;
  improvements?: string | null;
  next_step?: string | null;
  hint_question?: string | null;
}

/** Per-criterion internal score. Teacher-facing only. */
export interface OpenAnswerCriterionScore {
  id: string;
  name?: string | null;
  score: number;
}

/**
 * What an attempt was judged against, snapshotted when it was evaluated.
 *
 * The point is that editing a question does not rewrite the history of answers
 * already given: a teacher reading an old attempt sees the expected answer and
 * criteria as they stood *then*, not as they stand now.
 */
export interface OpenAnswerGradingBasis {
  question?: string | null;
  expected_answer?: string | null;
  solution?: string | null;
  criteria?: { id: string; name: string; description?: string; weight?: number }[] | null;
}

export interface OpenAnswerEvaluation {
  id: number;
  user?: { id: number; name: string; email: string; classroom_ids?: number[]; classroom_name?: string | null };
  course_id: string;
  lesson_id?: string | null;
  block_id: string;
  step_id?: string | null;
  answer_text: string;
  evaluated_by_ai: boolean;
  answered_at?: string | null;

  // ─── BR-P745Q8 ────────────────────────────────────────────────────────────
  feedback_parts?: OpenAnswerFeedbackParts | null;
  /** "evaluated" — feedback was shown. "failed" — AI was unusable, student got a retry. */
  attempt_status?: "evaluated" | "failed";
  /** 1-based, per question. A retry appends; it never overwrites. */
  attempt_number?: number;
  has_photo?: boolean;

  // ─── Teacher-only. The student API strips every field below. ──────────────
  is_correct?: boolean;
  ai_score?: number | null;
  ai_feedback?: string | null;
  criteria_scores?: OpenAnswerCriterionScore[] | null;
  grading_basis?: OpenAnswerGradingBasis | null;
  ai_model?: string | null;
  prompt_version?: string | null;
  teacher_override_score?: number | null;
  /** API path serving the photographed answer. Never a public R2 URL. */
  photo_url?: string | null;
}

export interface OpenAnswersResponse {
  data: OpenAnswerEvaluation[];
  meta?: {
    total_answers: number;
    unique_users?: number;
    ai_evaluated: number;
    failed_attempts?: number;
  };
}

export interface QuizAttempt {
  id?: number;
  user?: { id: number; name: string; email: string; classroom_ids?: number[]; classroom_name?: string | null };
  course_id?: string;
  total_questions: number;
  correct_answers: number;
  score_percent: number;
  time_spent_seconds: number;
  answers: QuizAttemptAnswer[] | string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface QuizAttemptsResponse {
  data: QuizAttempt[];
  meta: { total_attempts: number; unique_users: number; avg_score: number };
}

// ============================================================================
// ELO Types
// ============================================================================

export interface EloProfile {
  user_id: number;
  user?: { id: number; name: string; email: string | null };
  profil_elo: number[] | null;
  profil_pocet: number[] | null;
  updated_at: string | null;
}

export interface EloInteraction {
  id: number;
  user?: { id: number; name: string; email: string | null };
  block_id: string;
  course_id: string;
  source: 'lesson' | 'quiz' | null;
  score: number;
  profil_elo_snapshot: number[] | null;
  elo_vector_snapshot: number[] | null;
  updated_indices: number[] | null;
  created_at: string;
}

// ============================================================================
// Asset Types (R2 file management)
// ============================================================================

/** Course-less asset folders (BR-KPXQA8). */
export type AssetScope = "news";

export interface Asset {
  id: number;
  /** Set for assets that live outside a course; null for course assets. */
  scope: AssetScope | null;
  course_id: string | null;
  filename: string;
  path: string;
  url: string;
  size: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

export interface AssetsResponse {
  data: Asset[];
  meta: { total: number; total_size: number };
}

// Active work-time report (BR-9SAH2R).
export interface WorkTimeSession {
  course_id: string;
  start: string;
  end: string;
  duration: number;
}

export interface WorkTimeReport {
  total_seconds: number;
  by_course: Record<string, number>;
  by_day: Record<string, number>;
  sessions: WorkTimeSession[];
}

// ── Activity report (BR-AT7X2T) ──────────────────────────────────────────────

/** One student × one local calendar day with any activity. */
export interface ActivityRow {
  user_id: number;
  user_name: string;
  classroom_ids: number[];
  day: string;
  work_seconds: number;
  courses_visited: number;
  blocks_visited: number;
  practice_blocks: number;
  quiz_blocks: number;
  chats: number;
  news_opened: number;
  /** Outfit edits have no history yet — only shop purchases are counted. */
  avatar_purchases: number;
  games: number;
  /** Current XP total, repeated on every row of the student. */
  xp_points: number;
}

export interface ActivityReportMeta {
  from: string | null;
  to: string | null;
  students: number;
  timezone: string;
}
