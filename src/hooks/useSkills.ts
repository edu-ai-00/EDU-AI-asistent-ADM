import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
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

export function useVectors() {
  return useQuery({
    queryKey: VECTORS_KEY,
    queryFn: () => api.get<SkillVector[]>("/admin/vectors"),
  });
}

export function useVector(id: string | undefined) {
  return useQuery({
    queryKey: [...VECTORS_KEY, id],
    queryFn: () => api.get<SkillVector>(`/admin/vectors/${id}`),
    enabled: !!id,
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
  return useQuery({
    queryKey: [...VECTORS_KEY, vectorId, "dimensions"],
    queryFn: () =>
      api.get<VectorDimension[]>(`/admin/vectors/${vectorId}/dimensions`),
    enabled: !!vectorId,
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
