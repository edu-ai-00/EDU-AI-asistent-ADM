"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Mentor, MentorInput, RagEntity } from "@/types/mentor";

const MENTORS_KEY = ["mentors"];

export function useMentors() {
  return useQuery<Mentor[]>({
    queryKey: MENTORS_KEY,
    queryFn: () => api.get<Mentor[]>("/admin/mentors"),
  });
}

/**
 * Legal entities the RAG service offers, for the picker on a RAG mentor.
 * The endpoint answers 200 with an empty list when the service is down, so a
 * RAG outage degrades the field to free text instead of blocking the form.
 */
export function useRagEntities(enabled: boolean) {
  return useQuery<RagEntity[]>({
    queryKey: [...MENTORS_KEY, "rag-entities"],
    queryFn: () => api.get<RagEntity[]>("/admin/mentors/rag-entities"),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateMentor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MentorInput) => api.post<Mentor>("/admin/mentors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENTORS_KEY });
    },
  });
}

export function useUpdateMentor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & MentorInput) =>
      api.put<Mentor>(`/admin/mentors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENTORS_KEY });
    },
  });
}

export function useDeleteMentor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.delete<boolean>(`/admin/mentors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENTORS_KEY });
    },
  });
}
