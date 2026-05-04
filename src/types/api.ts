// API Response Types for Laravel eduai-api backend
// These types match the Laravel Course model response format

import type { CourseV2 } from "./block-v2";

// ============================================================================
// Course Types (from Laravel API)
// ============================================================================

export interface Course {
  id: number;
  course_id: string;
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
  classroom_id: number | null;
  classroom_name: string | null;
  email_verified_at: string | null;
  created_at: string;
  courses_count: number;
  completed_count: number;
  last_active_at: string | null;
  stats: AdminUserStats | null;
  is_guest: boolean;
  device_id: string | null;
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

export interface CourseProgressLesson {
  lesson_id: string;
  completed_blocks?: string[];
  block_answers?: Record<string, string> | unknown[];
  block_timestamps?: Record<string, BlockTimestamp>;
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
  lesson_id: string;
  block_id: string;
  note: string | null;
  created_at: string;
}

export interface AdminUserDetail {
  id: number;
  name: string;
  email: string;
  role: "student" | "teacher" | "admin";
  login_code: string | null;
  avatar_index: number | null;
  selected_subjects: string[] | null;
  classroom_id: number | null;
  classroom_name: string | null;
  email_verified_at: string | null;
  created_at: string;
  is_guest: boolean;
  device_id: string | null;
  stats: AdminUserDetailStats | null;
  courses: UserCourseInfo[];
  sessions: UserSessionInfo[];
  progress?: UserProgress[];
  quiz_attempts?: QuizAttempt[];
  bookmarks?: AdminBookmark[];
}

export interface UpdateUserInput {
  name?: string;
  email?: string | null;
  classroom_id?: number | null;
  role?: "student" | "teacher" | "admin";
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
}

export interface QuizAttempt {
  id?: number;
  user?: { id: number; name: string; email: string; classroom_id?: number | null };
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

export interface Asset {
  id: number;
  course_id: string;
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
