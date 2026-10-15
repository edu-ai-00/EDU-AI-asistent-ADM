"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import type { School, SchoolDetail, SchoolPayload } from "@/types/school";

const SCHOOLS_KEY = ["schools"];

/**
 * `/admin/schools` is admin-only, so for a signed-in teacher this stays idle
 * rather than firing a request that comes back 403 — the same guard useTeam()
 * needs for the same reason (BR-38FYMX).
 */
export function useSchools() {
  const { isAdmin } = useAuth();

  return useQuery<School[]>({
    queryKey: SCHOOLS_KEY,
    queryFn: () => api.get<School[]>("/admin/schools"),
    enabled: isAdmin,
  });
}

export function useSchool(id: number | null) {
  const { isAdmin } = useAuth();

  return useQuery<SchoolDetail>({
    queryKey: ["schools", id],
    queryFn: () => api.get<SchoolDetail>(`/admin/schools/${id}`),
    enabled: isAdmin && id !== null,
  });
}

export function useCreateSchool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SchoolPayload) => api.post<School>("/admin/schools", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHOOLS_KEY });
      // The Učitelé tab shows each teacher's schools (BR-R84FVD).
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

export function useUpdateSchool() {
  const queryClient = useQueryClient();

  return useMutation({
    // Partial: the school dialog adds or drops one teacher by sending
    // teacher_ids alone (BR-9Z59Z9); the API treats every field as optional.
    mutationFn: ({ id, ...payload }: Partial<SchoolPayload> & { id: number }) =>
      api.put<School>(`/admin/schools/${id}`, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: SCHOOLS_KEY });
      queryClient.invalidateQueries({ queryKey: ["schools", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

export function useDeleteSchool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/admin/schools/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHOOLS_KEY });
      // Classrooms survive the school but come back unfiled, so their list is
      // stale too — and so is every teacher's school list.
      queryClient.invalidateQueries({ queryKey: ["classrooms"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

/**
 * Replaces the school's whole class list in one call — classrooms left out are
 * unfiled (school_id = null), never deleted.
 */
export function useSyncSchoolClassrooms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, classroomIds }: { id: number; classroomIds: number[] }) =>
      api.put<School>(`/admin/schools/${id}/classrooms`, { classroom_ids: classroomIds }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: SCHOOLS_KEY });
      queryClient.invalidateQueries({ queryKey: ["schools", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["classrooms"] });
    },
  });
}
