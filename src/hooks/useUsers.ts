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
    },
  });
}
