import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { AdminUser, AdminUserDetail, UpdateUserInput } from "@/types/api";

const USERS_KEY = ["users"];

// ── Types ────────────────────────────────────────────────────────────────────

export interface UserFilters {
  search?: string;
  classroomIds?: number[];
  courseIds?: string[];
  userType?: "all" | "registered" | "guest";
  sort?: string;
  dir?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

export interface PaginatedUsers {
  users: AdminUser[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    last_page: number;
  };
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useUsers(filters: UserFilters = {}) {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.userType && filters.userType !== "all") params.set("user_type", filters.userType);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.dir) params.set("dir", filters.dir);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.perPage) params.set("per_page", String(filters.perPage));

  if (filters.classroomIds?.length) {
    for (const id of filters.classroomIds) {
      params.append("classroom_ids[]", String(id));
    }
  }
  if (filters.courseIds?.length) {
    for (const id of filters.courseIds) {
      params.append("course_ids[]", id);
    }
  }

  const qs = params.toString();
  const endpoint = `/admin/users${qs ? `?${qs}` : ""}`;

  return useQuery({
    queryKey: [...USERS_KEY, filters],
    queryFn: async (): Promise<PaginatedUsers> => {
      const res = await api.getFullResponse<{
        data: AdminUser[];
        meta: { total: number; page: number; per_page: number; last_page: number };
      }>(endpoint);
      return { users: res.data, meta: res.meta };
    },
    placeholderData: keepPreviousData,
  });
}

export function useUser(id: number | null) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => api.get<AdminUserDetail>(`/admin/users/${id}`),
    enabled: id !== null,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateUserInput & { id: number }) =>
      api.put<AdminUserDetail>(`/admin/users/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users", variables.id] });
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      // A role or school change here moves the person on the Učitelé and
      // Školy tabs too (BR-R84FVD).
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
  });
}

/**
 * Switch an account off or back on (BR-Q3ZJ6Q). Admin-only on the API.
 * Deactivating revokes every session the account holds; its data stays.
 * The team roster lists the same accounts, so it is refreshed too.
 */
export function useSetUserActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api.post<{ id: number; deactivated_at: string | null }>(
        `/admin/users/${id}/${active ? "reactivate" : "deactivate"}`,
        {},
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users", variables.id] });
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

/**
 * Delete a student and their whole history (BR-FXWJ8D). Admin-only on the
 * API, students only, irreversible. The deleted account's own detail query
 * is left alone — refetching it would only 404 under the page that is
 * navigating away — while lists and class rosters drop the student.
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/admin/users/${id}`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({
        queryKey: USERS_KEY,
        predicate: (query) => query.queryKey[1] !== id,
      });
      queryClient.invalidateQueries({ queryKey: ["classrooms"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}
