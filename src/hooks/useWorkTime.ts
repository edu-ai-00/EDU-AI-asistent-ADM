import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { WorkTimeReport } from "@/types/api";

/** Active work-time report for a single student (BR-9SAH2R). */
export function useUserWorkTime(userId: number | null) {
  return useQuery({
    queryKey: ["work-time", userId],
    queryFn: () => api.get<WorkTimeReport>(`/admin/users/${userId}/work-time`),
    enabled: userId !== null,
  });
}
