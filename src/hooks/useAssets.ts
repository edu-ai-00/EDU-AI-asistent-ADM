import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Asset, AssetsResponse, AssetScope } from "@/types/api";

const ASSETS_KEY = "assets";

/**
 * A folder in the admin Files section: either a course, or a course-less
 * scope such as Novinky (BR-KPXQA8).
 */
export type AssetFolder =
  | { courseId: string; scope?: undefined }
  | { scope: AssetScope; courseId?: undefined };

function folderQuery(folder: AssetFolder): string {
  return folder.scope
    ? `scope=${encodeURIComponent(folder.scope)}`
    : `course_id=${encodeURIComponent(folder.courseId)}`;
}

export function useAssets(folder: AssetFolder | undefined) {
  return useQuery({
    queryKey: [ASSETS_KEY, folder?.scope ?? null, folder?.courseId ?? null],
    queryFn: () =>
      api.getFullResponse<AssetsResponse>(`/admin/assets?${folderQuery(folder!)}`),
    enabled: !!folder,
  });
}

export function useUploadAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ folder, file }: { folder: AssetFolder; file: File }) => {
      const formData = new FormData();
      if (folder.scope) {
        formData.append("scope", folder.scope);
      } else {
        formData.append("course_id", folder.courseId);
      }
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
