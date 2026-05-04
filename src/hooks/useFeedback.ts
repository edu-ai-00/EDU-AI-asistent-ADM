import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { ContentFeedback } from "@/types/feedback";

const FEEDBACK_KEY = ["content-feedback"];

export function useFeedback(courseId?: string, type?: string) {
  const params = new URLSearchParams();
  if (courseId) params.set("course_id", courseId);
  if (type) params.set("type", type);
  const qs = params.toString();

  return useQuery({
    queryKey: [...FEEDBACK_KEY, courseId ?? "", type ?? ""],
    queryFn: () =>
      api.get<ContentFeedback[]>(
        `/admin/content-feedback${qs ? `?${qs}` : ""}`
      ),
  });
}

export function useFeedbackDetail(id: number | null) {
  return useQuery({
    queryKey: ["content-feedback", id],
    queryFn: () => api.get<ContentFeedback>(`/admin/content-feedback/${id}`),
    enabled: id !== null,
  });
}
