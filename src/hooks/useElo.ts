import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { EloProfile, EloInteraction } from "@/types/api";
import type { ComputedSkill } from "@/types/skills";

const ELO_KEY = ["elo"];

/** Single user's ELO profile. */
export function useUserEloProfile(userId: number | null) {
  return useQuery({
    queryKey: [...ELO_KEY, "profile", userId],
    queryFn: () => api.get<EloProfile>(`/admin/elo/profile/${userId}`),
    enabled: userId !== null,
  });
}

/** Server-computed skills for a user using a course's skill config. */
export function useUserSkills(userId: number | null, courseId: string | null, aggregated = true) {
  return useQuery({
    queryKey: [...ELO_KEY, "skills", userId, courseId, aggregated],
    queryFn: () =>
      api.get<{ user_id: number; course_id: number; skill_names: string[]; skills: ComputedSkill[] }>(
        `/admin/users/${userId}/skills?course_id=${encodeURIComponent(courseId!)}&aggregated=${aggregated}`
      ),
    enabled: userId !== null && courseId !== null,
  });
}

/** ELO interactions for a specific user. Optional course filter. */
export function useUserEloInteractions(
  userId: number | null,
  courseId?: string
) {
  const params = courseId
    ? `?course_id=${encodeURIComponent(courseId)}`
    : "";
  return useQuery({
    queryKey: [...ELO_KEY, "interactions", "user", userId, courseId ?? ""],
    queryFn: () =>
      api.get<EloInteraction[]>(
        `/admin/elo/interactions/user/${userId}${params}`
      ),
    enabled: userId !== null,
  });
}
