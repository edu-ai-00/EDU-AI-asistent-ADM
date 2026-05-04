import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { UserProgress, CourseProgressStats } from "@/types/api";

const PROGRESS_KEY = ["progress"];

/** All progress records for a course (includes user objects). Optional lesson filter. */
export function useCourseProgress(courseId: string | undefined, lessonId?: string) {
  const params = lessonId ? `?lesson_id=${encodeURIComponent(lessonId)}` : "";
  return useQuery({
    queryKey: [...PROGRESS_KEY, "course", courseId, lessonId ?? ""],
    queryFn: () => api.get<UserProgress[]>(`/admin/progress/${courseId}${params}`),
    enabled: !!courseId,
  });
}

/** Aggregated block stats for a course (attempts, correct, incorrect, liked). */
export function useCourseProgressStats(courseId: string | undefined) {
  return useQuery({
    queryKey: [...PROGRESS_KEY, "stats", courseId],
    queryFn: () => api.get<CourseProgressStats>(`/admin/progress/${courseId}/stats`),
    enabled: !!courseId,
  });
}

/** All progress for a specific user. Optional course filter. */
export function useUserProgress(userId: number | null, courseId?: string) {
  const params = courseId ? `?course_id=${encodeURIComponent(courseId)}` : "";
  return useQuery({
    queryKey: [...PROGRESS_KEY, "user", userId, courseId ?? ""],
    queryFn: () => api.get<UserProgress[]>(`/admin/progress/user/${userId}${params}`),
    enabled: userId !== null,
  });
}
