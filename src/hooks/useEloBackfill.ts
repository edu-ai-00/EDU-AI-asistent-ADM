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
