import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  SkillVector,
  CreateVectorInput,
  UpdateVectorInput,
  VectorDimension,
  CreateDimensionInput,
  UpdateDimensionInput,
  CourseSkillConfig,
  SaveCourseSkillConfigInput,
  CourseSkillsOverview,
  CourseSkillStats,
} from "@/types/skills";

const VECTORS_KEY = ["vectors"];
const SKILL_CONFIG_KEY = ["skill-config"];

// ============================================================================
// Vectors
// ============================================================================

/**
 * The vector catalogue is admin-only, so for a signed-in teacher this stays
 * idle rather than firing a request that comes back 403 (BR-JQMYFT) — the same
 * guard useSchools() needs for the same reason (BR-38FYMX). The Kurzy list
 * reads it only to label a card with the course's GPF vector, so a teacher
 * just gets a card without that label.
 */
export function useVectors() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: VECTORS_KEY,
    queryFn: () => api.get<SkillVector[]>("/admin/vectors"),
    enabled: isAdmin,
  });
}

export function useVector(id: string | undefined) {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: [...VECTORS_KEY, id],
    queryFn: () => api.get<SkillVector>(`/admin/vectors/${id}`),
    enabled: isAdmin && !!id,
  });
}

export function useCreateVector() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVectorInput) =>
      api.post<SkillVector>("/admin/vectors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VECTORS_KEY });
    },
  });
}

export function useUpdateVector(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateVectorInput) =>
      api.put<SkillVector>(`/admin/vectors/${id}`, data),
    onSuccess: (updated) => {
      queryClient.setQueryData([...VECTORS_KEY, id], updated);
      queryClient.invalidateQueries({ queryKey: VECTORS_KEY });
    },
  });
}

export function useDeleteVector() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/admin/vectors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VECTORS_KEY });
    },
  });
}

// ============================================================================
// Vector Dimensions
// ============================================================================

export function useVectorDimensions(vectorId: string | undefined) {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: [...VECTORS_KEY, vectorId, "dimensions"],
    queryFn: () =>
      api.get<VectorDimension[]>(`/admin/vectors/${vectorId}/dimensions`),
    enabled: isAdmin && !!vectorId,
  });
}

export function useCreateDimension(vectorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDimensionInput) =>
      api.post<VectorDimension>(
        `/admin/vectors/${vectorId}/dimensions`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...VECTORS_KEY, vectorId, "dimensions"],
      });
      queryClient.invalidateQueries({ queryKey: [...VECTORS_KEY, vectorId] });
    },
  });
}

export function useUpdateDimension(vectorId: string, dimensionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateDimensionInput) =>
      api.put<VectorDimension>(
        `/admin/vectors/${vectorId}/dimensions/${dimensionId}`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...VECTORS_KEY, vectorId, "dimensions"],
      });
    },
  });
}

export function useDeleteDimension(vectorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dimensionId: string) =>
      api.delete<void>(
        `/admin/vectors/${vectorId}/dimensions/${dimensionId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...VECTORS_KEY, vectorId, "dimensions"],
      });
      queryClient.invalidateQueries({ queryKey: [...VECTORS_KEY, vectorId] });
    },
  });
}

export function useBulkImportDimensions(vectorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dimensions: CreateDimensionInput[]) =>
      api.post<VectorDimension[]>(
        `/admin/vectors/${vectorId}/dimensions/bulk`,
        { dimensions }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...VECTORS_KEY, vectorId, "dimensions"],
      });
      queryClient.invalidateQueries({ queryKey: [...VECTORS_KEY, vectorId] });
    },
  });
}

// ============================================================================
// Course Skill Config
// ============================================================================

export function useCourseSkillConfig(courseId: number | undefined) {
  return useQuery({
    queryKey: [...SKILL_CONFIG_KEY, courseId],
    queryFn: () =>
      api.get<CourseSkillConfig>(`/admin/courses/${courseId}/skill-config`),
    enabled: !!courseId,
  });
}

export function useSaveCourseSkillConfig(courseId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SaveCourseSkillConfigInput) =>
      api.post<CourseSkillConfig>(
        `/admin/courses/${courseId}/skill-config`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...SKILL_CONFIG_KEY, courseId],
      });
    },
  });
}

// ============================================================================
// Course Skills Overview (heatmap)
// ============================================================================

export function useCourseSkillsOverview(courseId: number | undefined) {
  return useQuery({
    queryKey: ["skills-overview", courseId],
    queryFn: () =>
      api.get<CourseSkillsOverview>(
        `/admin/courses/${courseId}/skills/overview`
      ),
    enabled: !!courseId,
  });
}

// ============================================================================
// Course Statistics
// ============================================================================

export function useCourseSkillStats(courseId: number | undefined) {
  return useQuery({
    queryKey: ["skills-stats", courseId],
    queryFn: () =>
      api.get<CourseSkillStats>(`/admin/courses/${courseId}/skills/stats`),
    enabled: !!courseId,
  });
}
