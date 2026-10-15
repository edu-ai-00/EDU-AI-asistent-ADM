import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type {
  AvatarItem,
  AvatarItemInput,
  AvatarItemsResponse,
} from "@/types/avatar";

const AVATAR_ITEMS_KEY = "avatar-items";

export function useAvatarItems() {
  return useQuery({
    queryKey: [AVATAR_ITEMS_KEY],
    queryFn: () => api.getFullResponse<AvatarItemsResponse>("/admin/avatar-items"),
  });
}

/** Turn the form fields into multipart, booleans included as 1/0. */
function appendInput(formData: FormData, input: Partial<AvatarItemInput>) {
  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined) return;
    formData.append(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  });
}

export function useCreateAvatarItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, ...input }: AvatarItemInput & { file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      appendInput(formData, input);
      return api.uploadFormData<AvatarItem>("/admin/avatar-items/upload", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AVATAR_ITEMS_KEY] });
    },
  });
}

export function useUpdateAvatarItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      file,
      ...input
    }: Partial<AvatarItemInput> & { id: number; file?: File | null }) => {
      // Metadata-only edits go as plain JSON. A replacement SVG has to travel
      // as multipart, and multipart cannot be sent as PUT from the browser —
      // hence Laravel's `_method` spoofing on a POST.
      if (!file) {
        return api.put<AvatarItem>(`/admin/avatar-items/${id}`, input);
      }

      const formData = new FormData();
      formData.append("_method", "PUT");
      formData.append("file", file);
      appendInput(formData, input);
      return api.uploadFormData<AvatarItem>(`/admin/avatar-items/${id}`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AVATAR_ITEMS_KEY] });
    },
  });
}

export function useDeleteAvatarItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/admin/avatar-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AVATAR_ITEMS_KEY] });
    },
  });
}
