import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api/client";
import type { MergePreview, MergeResult } from "@/types/user-merge";

// Endpoint shape per spec §5.3:
//   GET  /api/admin/users/merge/preview?source_id=X&target_id=Y
//   POST /api/admin/users/merge   { source_id, target_id }

export function previewUserMerge(
  sourceId: number,
  targetId: number
): Promise<MergePreview> {
  const params = new URLSearchParams({
    source_id: String(sourceId),
    target_id: String(targetId),
  });
  return api.get<MergePreview>(`/admin/users/merge/preview?${params.toString()}`);
}

export function mergeUsers(
  sourceId: number,
  targetId: number
): Promise<MergeResult> {
  return api.post<MergeResult>("/admin/users/merge", {
    source_id: sourceId,
    target_id: targetId,
  });
}

// React Query hooks ---------------------------------------------------------

export function useMergePreview(
  sourceId: number | null,
  targetId: number | null,
  enabled: boolean
) {
  return useQuery<MergePreview, ApiError>({
    queryKey: ["users", "merge", "preview", sourceId, targetId],
    queryFn: () => previewUserMerge(sourceId as number, targetId as number),
    enabled: enabled && sourceId !== null && targetId !== null && sourceId !== targetId,
    // Preview is rarely re-used; don't keep it stale across direction changes.
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}

export function useMergeUsers() {
  const queryClient = useQueryClient();

  return useMutation<MergeResult, ApiError, { sourceId: number; targetId: number }>({
    mutationFn: ({ sourceId, targetId }) => mergeUsers(sourceId, targetId),
    onSuccess: () => {
      // Invalidate users list and any individual user details so admin sees
      // updated state after merge.
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
