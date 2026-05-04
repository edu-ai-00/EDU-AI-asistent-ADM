// Types for the User Merge feature.
//
// The exact backend payload shape is defined informally in spec §7.2.
// These types describe what the frontend expects; the dialog also tolerates
// missing/extra fields gracefully.

export interface MergeUserSummary {
  id: number;
  name: string;
  email: string | null;
  login_code: string | null;
  role: "student" | "teacher" | "admin" | "guest";
  avatar_index?: number | null;
  is_guest?: boolean;
  classroom_name?: string | null;
  created_at?: string | null;
  last_login_at?: string | null;
  last_active_at?: string | null;
  // Aggregate stats used in compare table
  stats?: {
    xp_points: number;
    level: number;
    streak_days: number;
    achievements_count?: number;
    courses_count?: number;
  } | null;
  // Counts shown in compare table
  counts?: {
    quiz_attempts?: number;
    chats?: number;
    bookmarks?: number;
    achievements?: number;
    courses?: number;
  };
}

export interface MergeCourseDiff {
  course_id: string;
  course_name: string;
  source_progress_percent: number | null;
  target_progress_percent: number | null;
  source_time_spent_seconds: number | null;
  target_time_spent_seconds: number | null;
  result_progress_percent: number | null;
  result_time_spent_seconds: number | null;
  // Which side wins for this course (used to highlight)
  winner: "source" | "target" | "tie" | null;
}

// Per-section diff: which side wins (used for green highlight) and the
// post-merge result value.
export interface MergeSectionDiff {
  field: string;
  source_value: unknown;
  target_value: unknown;
  result_value: unknown;
  winner: "source" | "target" | "tie" | null;
}

export interface MergePreview {
  source: MergeUserSummary;
  target: MergeUserSummary;
  // The user whose row is preserved as the keeper.
  winner_user_id: number;
  // True when direction is forced (email vs PIN-only): admin can't swap.
  direction_locked: boolean;
  // Reason for the lock (e.g. "email_vs_pin"); optional, used for banner copy.
  direction_reason?: string | null;
  // Server may surface a blocking error here (e.g. user already merged,
  // is admin/teacher, etc.) — frontend renders it instead of the table.
  blocking_error?: string | null;
  // Per-section diffs. We don't enforce a strict shape since spec §7.2 lists
  // these as broad categories; render whatever the backend returns.
  identity?: MergeSectionDiff[];
  stats?: MergeSectionDiff[];
  counts?: MergeSectionDiff[];
  courses?: MergeCourseDiff[];
  // Raw post-merge preview of the target user (after merge applied) — used
  // for the "result" column when section diffs aren't broken out.
  result?: Partial<MergeUserSummary>;
  // Generic catch-all in case backend adds more sections.
  // (Not strictly typed; consumers should cast or guard.)
  [key: string]: unknown;
}

export interface MergeResult {
  id: number;
  source_user_id: number;
  target_user_id: number;
  performed_by: number;
  created_at: string;
  // Per-table merge summary (see spec §4.2 strategy_log)
  strategy_log?: Record<string, Record<string, number>>;
}
