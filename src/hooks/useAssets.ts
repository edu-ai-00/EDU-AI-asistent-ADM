import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Asset, AssetsResponse } from "@/types/api";

const ASSETS_KEY = "assets";

export function useAssets(courseId: string | undefined) {
  return useQuery({
    queryKey: [ASSETS_KEY, courseId],
    queryFn: () =>
      api.getFullResponse<AssetsResponse>(
        `/admin/assets?course_id=${courseId}`
      ),
    enabled: !!courseId,
  });
}

export function useUploadAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, file }: { courseId: string; file: File }) => {
      const formData = new FormData();
      formData.append("course_id", courseId);
      formData.append("file", file);
      return api.uploadFormData<Asset>("/admin/assets/upload", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ASSETS_KEY] });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/admin/assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ASSETS_KEY] });
    },
  });
}
