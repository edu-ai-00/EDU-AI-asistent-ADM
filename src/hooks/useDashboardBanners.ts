"use client";

// Dashboard banners (BR-SAWX2U). Admin-only endpoints, so every query stays
// idle for a teacher instead of collecting a 403 (BR-38FYMX).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import type { DashboardBanner, DashboardBannerInput } from "@/types/dashboard-banners";

const ROOT = "dashboard-banners";

export const dashboardBannerKeys = {
  all: [ROOT] as const,
  list: [ROOT, "list"] as const,
  detail: (id: number) => [ROOT, "detail", id] as const,
};

/**
 * The banner list. `api.get` unwraps Laravel's `data`, so the endpoint's
 * `meta` catalogue is left behind — the editor's option lists live in
 * types/dashboard-banners.ts, and the server validates the choice anyway.
 */
export function useDashboardBanners() {
  const { isAdmin } = useAuth();
  return useQuery<DashboardBanner[]>({
    queryKey: dashboardBannerKeys.list,
    queryFn: () => api.get<DashboardBanner[]>("/admin/dashboard-banners"),
    enabled: isAdmin,
  });
}

export function useCreateDashboardBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DashboardBannerInput) =>
      api.post<DashboardBanner>("/admin/dashboard-banners", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardBannerKeys.all });
    },
  });
}

export function useUpdateDashboardBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: DashboardBannerInput }) =>
      api.put<DashboardBanner>(`/admin/dashboard-banners/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardBannerKeys.all });
    },
  });
}

export function useDeleteDashboardBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/admin/dashboard-banners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardBannerKeys.all });
    },
  });
}
