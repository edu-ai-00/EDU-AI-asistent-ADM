"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import type { SchoolRef } from "@/lib/school-filter";

/** Roles the team editor can assign. `student` means "no longer on the team". */
export type TeamRole = "admin" | "teacher" | "student";

/**
 * Where a team account stands (BR-XW6CWV). `expired` is an invite nobody
 * accepted in time — it needs a resend before that person can sign in.
 * Accounts from before the lifecycle existed come back `active`.
 */
export type TeamStatus = "invited" | "expired" | "active" | "deactivated";

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: "admin" | "teacher";
  status: TeamStatus;
  invited_at: string | null;
  invite_expires_at: string | null;
  /** The schools this member is filed under; empty when none. */
  schools: SchoolRef[];
  created_at: string;
  deactivated_at: string | null;
}

/**
 * The team roster. `/admin/team` is admin-only, so for a signed-in teacher
 * this stays idle rather than firing a request that comes back 403 on every
 * screen that happens to import it (BR-38FYMX).
 */
export function useTeam() {
  const { isAdmin } = useAuth();

  return useQuery<TeamMember[]>({
    queryKey: ["team"],
    queryFn: () => api.get<TeamMember[]>("/admin/team"),
    enabled: isAdmin,
  });
}

export function useCreateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      email: string;
      role: "admin" | "teacher";
      school_ids?: number[];
    }) => api.post<TeamMember>("/admin/team", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      // An invite can assign schools, which the Schools tab lists teachers of.
      queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
  });
}

/**
 * `student` is a valid target role even though the roster only ever lists
 * admins and teachers — it is how a member leaves the team, and the account
 * stays put as an ordinary user (BR-YZJWEA).
 */
export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: number;
      name?: string;
      email?: string;
      role?: TeamRole;
      school_ids?: number[];
    }) => api.put<TeamMember>(`/admin/team/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/admin/team/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      // Leaving the team also unfiles the member from every school
      // (BR-9Z59Z9), which the Schools tab lists as their teachers.
      queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
  });
}

/**
 * Send a pending or expired invite again (BR-XW6CWV) — same account, fresh
 * expiry. Deactivating is the account-wide useSetUserActive() (BR-Q3ZJ6Q).
 */
export function useResendTeamInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.post<TeamMember>(`/admin/team/${id}/resend`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}
