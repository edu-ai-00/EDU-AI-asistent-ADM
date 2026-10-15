import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { OpenAnswerEvaluation, OpenAnswersResponse } from "@/types/api";

const OPEN_ANSWERS_KEY = ["open-answers"];

/** All AI-graded open answers for a course (includes aggregate meta). */
export function useOpenAnswers(courseId: string | undefined) {
  return useQuery({
    queryKey: [...OPEN_ANSWERS_KEY, courseId],
    queryFn: () =>
      api.getFullResponse<OpenAnswersResponse>(
        `/admin/open-answers/${courseId}`,
      ),
    enabled: !!courseId,
  });
}

/** Open answers of one user, optionally narrowed to a single course. */
export function useUserOpenAnswers(userId: number | null, courseId?: string) {
  const params = courseId
    ? `?course_id=${encodeURIComponent(courseId)}`
    : "";
  return useQuery({
    queryKey: [...OPEN_ANSWERS_KEY, "user", userId, courseId ?? ""],
    queryFn: () =>
      api.get<OpenAnswerEvaluation[]>(
        `/admin/open-answers/user/${userId}${params}`,
      ),
    enabled: userId !== null,
  });
}
