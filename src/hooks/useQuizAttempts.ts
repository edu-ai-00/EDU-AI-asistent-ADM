import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { QuizAttemptsResponse, QuizAttempt } from "@/types/api";

const QUIZ_KEY = ["quiz-attempts"];

/** All quiz attempts for a course (includes meta with aggregate stats). */
export function useQuizAttempts(courseId: string | undefined) {
  return useQuery({
    queryKey: [...QUIZ_KEY, courseId],
    queryFn: () =>
      api.getFullResponse<QuizAttemptsResponse>(
        `/admin/quiz-attempts/${courseId}`,
      ),
    enabled: !!courseId,
  });
}

/** Quiz attempts for a specific user, optionally filtered by course. */
export function useUserQuizAttempts(
  userId: number | null,
  courseId?: string,
) {
  const params = courseId
    ? `?course_id=${encodeURIComponent(courseId)}`
    : "";
  return useQuery({
    queryKey: [...QUIZ_KEY, "user", userId, courseId ?? ""],
    queryFn: () =>
      api.get<QuizAttempt[]>(`/admin/quiz-attempts/user/${userId}${params}`),
    enabled: userId !== null,
  });
}
