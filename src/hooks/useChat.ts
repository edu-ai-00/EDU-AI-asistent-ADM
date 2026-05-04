import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type {
  ChatSession,
  ChatSessionDetail,
  ChatMessage,
  ChatSessionsFilters,
  PaginatedChatSessions,
} from "@/types/chat";

const CHAT_SESSIONS_KEY = ["chat-sessions"];

// ── List sessions (paginated, filterable) ───────────────────────────────────

export function useChatSessions(filters: ChatSessionsFilters = {}) {
  const params = new URLSearchParams();

  if (filters.user_id) params.set("user_id", String(filters.user_id));
  if (filters.persona) params.set("persona", filters.persona);
  if (filters.classroom_id) params.set("classroom_id", String(filters.classroom_id));
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));

  const qs = params.toString();
  const endpoint = `/admin/chat/sessions${qs ? `?${qs}` : ""}`;

  return useQuery({
    queryKey: [...CHAT_SESSIONS_KEY, filters],
    queryFn: async (): Promise<PaginatedChatSessions> => {
      const res = await api.getFullResponse<{
        data: ChatSession[];
        meta: { current_page: number; last_page: number; per_page: number; total: number };
      }>(endpoint);
      return { sessions: res.data, meta: res.meta };
    },
    placeholderData: keepPreviousData,
  });
}

// ── Session detail (with all messages) ──────────────────────────────────────

export function useChatSession(id: number | null) {
  return useQuery({
    queryKey: ["chat-session", id],
    queryFn: () => api.get<ChatSessionDetail>(`/admin/chat/sessions/${id}`),
    enabled: id !== null,
  });
}

// ── Teacher reply ───────────────────────────────────────────────────────────

export function useChatReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, content }: { sessionId: number; content: string }) =>
      api.post<ChatMessage>(`/admin/chat/sessions/${sessionId}/reply`, { content }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chat-session", variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: CHAT_SESSIONS_KEY });
    },
  });
}
