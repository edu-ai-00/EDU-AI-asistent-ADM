import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type {
  DebugReportDetail,
  DebugReportsResponse,
} from "@/types/debug-report";

export function useDebugReports(userId?: number) {
  const params = new URLSearchParams();
  if (userId) params.set("user_id", String(userId));
  const qs = params.toString();

  return useQuery({
    queryKey: ["debug-reports", userId],
    queryFn: () =>
      api.getFullResponse<DebugReportsResponse>(
        `/admin/debug-reports${qs ? `?${qs}` : ""}`
      ),
  });
}

export function useDebugReport(id: number | null) {
  return useQuery({
    queryKey: ["debug-reports", id],
    queryFn: () => api.get<DebugReportDetail>(`/admin/debug-reports/${id}`),
    enabled: id !== null,
  });
}
