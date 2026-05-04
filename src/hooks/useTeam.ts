"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: "admin" | "teacher";
  created_at: string;
}

export function useTeam() {
  return useQuery<TeamMember[]>({
    queryKey: ["team"],
    queryFn: () => api.get<TeamMember[]>("/admin/team"),
  });
}

export function useCreateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; email: string; role: "admin" | "teacher" }) =>
      api.post<TeamMember>("/admin/team", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name?: string; email?: string; role?: "admin" | "teacher" }) =>
      api.put<TeamMember>(`/admin/team/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/admin/team/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}
