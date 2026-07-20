import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BackfillPreviewUser {
  id: number;
  name: string;
  blocks_attempted: number;
  already_processed: number;
  pending: number;
}

export interface BackfillPreview {
  course_id: string;
  course_name: string;
  total_users_with_progress: number;
  blocks_with_gpf: number;
  blocks_total: number;
  existing_interactions: number;
  pending_pairs: number;
  users: BackfillPreviewUser[];
}

export interface BackfillResultDetail {
  user_id: number;
  user_name: string;
  interactions: number;
  final_avg_elo: number | null;
}

export interface BackfillResult {
  users_processed: number;
  interactions_created: number;
  profiles_updated: number;
  block_stats_updated: number;
  errors: Array<{ user_id: number; error: string }>;
  details: BackfillResultDetail[];
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useBackfillPreview(courseId: string | null) {
  return useQuery({
    queryKey: ["elo-backfill", "preview", courseId],
    queryFn: () =>
      api.get<BackfillPreview>(
        `/admin/elo/backfill/preview/${courseId}`
      ),
    enabled: !!courseId,
  });
}

export function useBackfillRun() {
  return useMutation({
    mutationFn: ({ courseId, userId }: { courseId: string; userId?: number }) => {
      const params = userId ? `?user_id=${userId}` : "";
      return api.post<BackfillResult>(`/admin/elo/backfill/run/${courseId}${params}`, {});
    },
  });
}

// ─── Timestamp backfill ──────────────────────────────────────────────────────

/**
 * Result of POST /admin/elo/backfill/timestamps/{courseId}.
 *
 * - `pending`: number of `elo_interactions` rows that still needed
 *   timing data when the run started.
 * - `lesson_filled`: rows with `source = lesson` that got real timestamps
 *   from `user_courses.progress_data`.
 * - `quiz_filled`: rows with `source = quiz` that got synthesised
 *   timestamps from inter-row deltas inside a quiz session.
 * - `unresolved`: rows the run couldn't fill (rare — e.g. corrupt data).
 * - `dry_run`: echoes whether the request was a dry run (no DB writes).
 */
export interface TimestampBackfillResult {
  course_id: string;
  /** Rows touched in this single HTTP call. */
  pending: number;
  /** Same as `pending` — number of rows the server processed this call. */
  processed: number;
  /** Rows still matching the filter after this call. 0 ⇒ done. */
  total_remaining: number;
  lesson_filled: number;
  quiz_filled: number;
  unresolved: number;
  /** True when no further calls are required for this course. */
  done: boolean;
  dry_run: boolean;
}

/**
 * Backfill `opened_at` / `confirmed_at` / `duration_ms` on historical
 * `elo_interactions` rows so the ELO CSV export shows per-block solving
 * times for lessons and quizzes even before the new app build ships.
 *
 * Pass `dryRun: true` first to preview counts without writing.
 */
export function useBackfillTimestamps() {
  return useMutation({
    mutationFn: ({
      courseId,
      dryRun,
      force,
      limit,
    }: {
      courseId: string;
      /** Preview counts without writing. */
      dryRun?: boolean;
      /**
       * Also reprocess rows that already have stored timing but show the
       * tell-tale `duration_ms = 0` from a previous buggy run. Rows with
       * a positive `duration_ms` (real client-sent timings) are never
       * touched, regardless of this flag.
       */
      force?: boolean;
      /** Cap on rows processed per HTTP call. Server clamps to [1, 5000]. */
      limit?: number;
    }) => {
      const params = new URLSearchParams();
      if (dryRun) params.set("dry_run", "1");
      if (force) params.set("force", "1");
      if (limit !== undefined) params.set("limit", String(limit));
      const qs = params.toString();
      return api.post<TimestampBackfillResult>(
        `/admin/elo/backfill/timestamps/${courseId}${qs ? `?${qs}` : ""}`,
        {}
      );
    },
  });
}
