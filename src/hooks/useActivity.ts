import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { ActivityRow, ActivityReportMeta } from "@/types/api";

export interface ActivityFilters {
  classroomId?: number | null;
  /** Inclusive local day, YYYY-MM-DD. */
  from?: string;
  to?: string;
}

export function activityQueryString(filters: ActivityFilters): string {
  const params = new URLSearchParams();
  if (filters.classroomId) params.set("classroom_id", String(filters.classroomId));
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Per-student daily activity overview (BR-AT7X2T). */
export function useActivityReport(filters: ActivityFilters) {
  const endpoint = `/admin/activity${activityQueryString(filters)}`;

  return useQuery({
    queryKey: ["activity", filters],
    queryFn: async () => {
      const res = await api.getFullResponse<{ data: ActivityRow[]; meta: ActivityReportMeta }>(endpoint);
      return { rows: res.data, meta: res.meta };
    },
    placeholderData: keepPreviousData,
  });
}
