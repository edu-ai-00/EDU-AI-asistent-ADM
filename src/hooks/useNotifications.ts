"use client";

// Notification admin (NOTIF-8/9/10, BR-QK6WW3) — types, rules, catalog,
// broadcasts, history and queue health. Every endpoint is admin-only, so each
// query stays idle for a teacher instead of collecting a 403 (BR-38FYMX).

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import {
  RULE_FILTER_KEYS,
  buildQueryString,
  historyQueryString,
  normalizeNotificationMeta,
} from "@/lib/notifications";
import type { AuditLogEntry } from "@/types/audit-log";
import type {
  BroadcastEstimate,
  BroadcastPreview,
  BroadcastTargeting,
  NotificationBroadcast,
  NotificationBroadcastInput,
  NotificationEventRow,
  NotificationHistoryDetail,
  NotificationHistoryFilters,
  NotificationHistoryResponse,
  NotificationMeta,
  NotificationMetaResponse,
  NotificationPreviewInput,
  NotificationRule,
  NotificationRuleFilters,
  NotificationRuleInput,
  NotificationTestResult,
  NotificationType,
  NotificationTypePreview,
  NotificationTypeTestInput,
  NotificationTypeUpdate,
  QueueHealth,
  RuleTestInput,
  RuleTestResult,
  RuleValidationResult,
} from "@/types/notifications";

const ROOT = "notifications";

export const notificationKeys = {
  meta: [ROOT, "meta"] as const,
  types: [ROOT, "types"] as const,
  type: (id: number) => [ROOT, "types", id] as const,
  typeAudit: (id: number) => [ROOT, "types", id, "audit"] as const,
  typePreview: (id: number, input: NotificationPreviewInput) =>
    [ROOT, "types", id, "preview", input] as const,
  rules: [ROOT, "rules"] as const,
  ruleList: (filters: NotificationRuleFilters) => [ROOT, "rules", "list", filters] as const,
  rule: (id: number) => [ROOT, "rules", "detail", id] as const,
  ruleAudit: (id: number) => [ROOT, "rules", "detail", id, "audit"] as const,
  broadcasts: [ROOT, "broadcasts"] as const,
  broadcastList: (status: string) => [ROOT, "broadcasts", "list", status] as const,
  broadcast: (id: number) => [ROOT, "broadcasts", "detail", id] as const,
  estimate: (targeting: BroadcastTargeting) => [ROOT, "broadcasts", "estimate", targeting] as const,
  history: [ROOT, "history"] as const,
  historyList: (filters: NotificationHistoryFilters, page: number) =>
    [ROOT, "history", "list", filters, page] as const,
  historyEntry: (id: number) => [ROOT, "history", "detail", id] as const,
  queueHealth: [ROOT, "queue-health"] as const,
};

/** Audit endpoints may answer a bare list or a paginated `{data}` page. */
function auditEntries(raw: unknown): AuditLogEntry[] {
  if (Array.isArray(raw)) return raw as AuditLogEntry[];
  if (raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)) {
    return (raw as { data: AuditLogEntry[] }).data;
  }
  return [];
}

// ── Catalog ──────────────────────────────────────────────────────────────────

export function useNotificationMeta() {
  const { isAdmin } = useAuth();
  return useQuery<NotificationMetaResponse, Error, NotificationMeta>({
    queryKey: notificationKeys.meta,
    queryFn: () => api.get<NotificationMetaResponse>("/admin/notifications/meta"),
    select: normalizeNotificationMeta,
    enabled: isAdmin,
    staleTime: 5 * 60_000,
  });
}

/** Queue strip on the history tab; refreshed every 30 s while it is open. */
export function useNotificationQueueHealth() {
  const { isAdmin } = useAuth();
  return useQuery<QueueHealth>({
    queryKey: notificationKeys.queueHealth,
    queryFn: () => api.get<QueueHealth>("/admin/notifications/queue-health"),
    enabled: isAdmin,
    refetchInterval: 30_000,
  });
}

// ── Types ────────────────────────────────────────────────────────────────────

export function useNotificationTypes() {
  const { isAdmin } = useAuth();
  return useQuery<NotificationType[]>({
    queryKey: notificationKeys.types,
    queryFn: () => api.get<NotificationType[]>("/admin/notification-types"),
    enabled: isAdmin,
  });
}

export function useNotificationType(id: number) {
  const { isAdmin } = useAuth();
  return useQuery<NotificationType>({
    queryKey: notificationKeys.type(id),
    queryFn: () => api.get<NotificationType>(`/admin/notification-types/${id}`),
    enabled: isAdmin && Number.isFinite(id),
  });
}

export function useNotificationTypeAudit(id: number) {
  const { isAdmin } = useAuth();
  return useQuery<AuditLogEntry[]>({
    queryKey: notificationKeys.typeAudit(id),
    queryFn: async () => auditEntries(await api.get<unknown>(`/admin/notification-types/${id}/audit`)),
    enabled: isAdmin && Number.isFinite(id),
  });
}

export function useUpdateNotificationType(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NotificationTypeUpdate) =>
      api.put<NotificationType>(`/admin/notification-types/${id}`, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(notificationKeys.type(id), updated);
      queryClient.invalidateQueries({ queryKey: notificationKeys.types });
      queryClient.invalidateQueries({ queryKey: notificationKeys.typeAudit(id) });
    },
  });
}

/**
 * Live preview of unsaved templates (no save). The caller debounces `input`;
 * the previous render stays on screen while the next one loads.
 */
export function useNotificationTypePreview(id: number, input: NotificationPreviewInput | null) {
  const { isAdmin } = useAuth();
  return useQuery<NotificationTypePreview>({
    queryKey: notificationKeys.typePreview(id, input ?? {}),
    queryFn: () => api.post<NotificationTypePreview>(`/admin/notification-types/${id}/preview`, input ?? {}),
    enabled: isAdmin && Number.isFinite(id) && input !== null,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 60_000,
  });
}

export function useSendNotificationTypeTest(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NotificationTypeTestInput) =>
      api.post<NotificationTestResult>(`/admin/notification-types/${id}/test`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.history });
    },
  });
}

// ── Rules ────────────────────────────────────────────────────────────────────

export function useNotificationRules(filters: NotificationRuleFilters) {
  const { isAdmin } = useAuth();
  return useQuery<NotificationRule[]>({
    queryKey: notificationKeys.ruleList(filters),
    queryFn: () =>
      api.get<NotificationRule[]>(
        `/admin/notification-rules${buildQueryString(filters, RULE_FILTER_KEYS)}`
      ),
    enabled: isAdmin,
    placeholderData: keepPreviousData,
  });
}

export function useNotificationRule(id: number | null) {
  const { isAdmin } = useAuth();
  return useQuery<NotificationRule>({
    queryKey: notificationKeys.rule(id ?? -1),
    queryFn: () => api.get<NotificationRule>(`/admin/notification-rules/${id}`),
    enabled: isAdmin && id !== null && Number.isFinite(id),
  });
}

export function useNotificationRuleAudit(id: number | null) {
  const { isAdmin } = useAuth();
  return useQuery<AuditLogEntry[]>({
    queryKey: notificationKeys.ruleAudit(id ?? -1),
    queryFn: async () => auditEntries(await api.get<unknown>(`/admin/notification-rules/${id}/audit`)),
    enabled: isAdmin && id !== null && Number.isFinite(id),
  });
}

function useInvalidateRules() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: notificationKeys.rules });
    // rules_count on the type list.
    queryClient.invalidateQueries({ queryKey: notificationKeys.types });
  };
}

export function useCreateNotificationRule() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateRules();
  return useMutation({
    mutationFn: (payload: NotificationRuleInput) =>
      api.post<NotificationRule>("/admin/notification-rules", payload),
    onSuccess: (created) => {
      // The editor redirects to the new rule's page right away.
      if (created && typeof created === "object" && "id" in created) {
        queryClient.setQueryData(notificationKeys.rule(created.id), created);
      }
      invalidate();
    },
  });
}

export function useUpdateNotificationRule(id: number) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateRules();
  return useMutation({
    mutationFn: (payload: NotificationRuleInput) =>
      api.put<NotificationRule>(`/admin/notification-rules/${id}`, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(notificationKeys.rule(id), updated);
      invalidate();
    },
  });
}

export function useDeleteNotificationRule() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateRules();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/admin/notification-rules/${id}`),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: notificationKeys.rule(id) });
      invalidate();
    },
  });
}

export function useValidateNotificationRule() {
  return useMutation({
    mutationFn: (definition: unknown) =>
      api.post<RuleValidationResult>("/admin/notification-rules/validate", { definition }),
  });
}

export function useTestNotificationRule(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RuleTestInput) =>
      api.post<RuleTestResult>(`/admin/notification-rules/${id}/test`, payload),
    onSuccess: (_data, payload) => {
      if (payload.send) queryClient.invalidateQueries({ queryKey: notificationKeys.history });
    },
  });
}

// ── Broadcasts ───────────────────────────────────────────────────────────────

/** `status` = "" for all. Polls while any listed broadcast is still sending. */
export function useNotificationBroadcasts(status: string) {
  const { isAdmin } = useAuth();
  return useQuery<NotificationBroadcast[]>({
    queryKey: notificationKeys.broadcastList(status),
    queryFn: () =>
      api.get<NotificationBroadcast[]>(
        `/admin/notification-broadcasts${status ? `?status=${encodeURIComponent(status)}` : ""}`
      ),
    enabled: isAdmin,
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      query.state.data?.some((b) => b.status === "sending") ? 3_000 : false,
  });
}

/** One broadcast; re-fetched every 3 s while it is `sending` (NOTIF-10 progress). */
export function useNotificationBroadcast(id: number | null) {
  const { isAdmin } = useAuth();
  return useQuery<NotificationBroadcast>({
    queryKey: notificationKeys.broadcast(id ?? -1),
    queryFn: () => api.get<NotificationBroadcast>(`/admin/notification-broadcasts/${id}`),
    enabled: isAdmin && id !== null && Number.isFinite(id),
    refetchInterval: (query) => (query.state.data?.status === "sending" ? 3_000 : false),
  });
}

function useBroadcastWriteCache() {
  const queryClient = useQueryClient();
  return (broadcast: NotificationBroadcast | undefined) => {
    if (broadcast && typeof broadcast === "object" && "id" in broadcast) {
      queryClient.setQueryData(notificationKeys.broadcast(broadcast.id), broadcast);
    }
    queryClient.invalidateQueries({ queryKey: [ROOT, "broadcasts", "list"] });
  };
}

export function useCreateNotificationBroadcast() {
  const write = useBroadcastWriteCache();
  return useMutation({
    mutationFn: (payload: NotificationBroadcastInput) =>
      api.post<NotificationBroadcast>("/admin/notification-broadcasts", payload),
    onSuccess: write,
  });
}

export function useUpdateNotificationBroadcast() {
  const write = useBroadcastWriteCache();
  return useMutation({
    mutationFn: ({ id, ...payload }: NotificationBroadcastInput & { id: number }) =>
      api.put<NotificationBroadcast>(`/admin/notification-broadcasts/${id}`, payload),
    onSuccess: write,
  });
}

export function useDeleteNotificationBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/admin/notification-broadcasts/${id}`),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: notificationKeys.broadcast(id) });
      queryClient.invalidateQueries({ queryKey: [ROOT, "broadcasts", "list"] });
    },
  });
}

/** Recipient estimate for the (possibly unsaved) targeting; the caller debounces. */
export function useBroadcastEstimate(targeting: BroadcastTargeting | null) {
  const { isAdmin } = useAuth();
  return useQuery<BroadcastEstimate>({
    queryKey: notificationKeys.estimate(
      targeting ?? { school_ids: [], classroom_ids: [], roles: [] }
    ),
    queryFn: () =>
      api.post<BroadcastEstimate>("/admin/notification-broadcasts/estimate", { targeting }),
    enabled: isAdmin && targeting !== null,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useBroadcastPreview() {
  return useMutation({
    mutationFn: (id: number) =>
      api.post<BroadcastPreview>(`/admin/notification-broadcasts/${id}/preview`, {}),
  });
}

export function useSendNotificationBroadcast() {
  const write = useBroadcastWriteCache();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirmWide }: { id: number; confirmWide: boolean }) =>
      api.post<NotificationBroadcast>(`/admin/notification-broadcasts/${id}/send`, {
        confirm_wide: confirmWide,
      }),
    onSuccess: (broadcast, { id }) => {
      write(broadcast);
      // 202 bodies are the broadcast; re-read anyway so polling starts from the server's state.
      queryClient.invalidateQueries({ queryKey: notificationKeys.broadcast(id) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.history });
    },
  });
}

export function useArchiveNotificationBroadcast() {
  const write = useBroadcastWriteCache();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post<NotificationBroadcast>(`/admin/notification-broadcasts/${id}/archive`, {}),
    onSuccess: (broadcast, id) => {
      write(broadcast);
      queryClient.invalidateQueries({ queryKey: notificationKeys.broadcast(id) });
    },
  });
}

// ── History ──────────────────────────────────────────────────────────────────

export const NOTIFICATION_HISTORY_PER_PAGE = 50;

export function useNotificationHistory(filters: NotificationHistoryFilters, page: number) {
  const { isAdmin } = useAuth();
  const endpoint = `/admin/notification-history${historyQueryString(filters, {
    page,
    per_page: NOTIFICATION_HISTORY_PER_PAGE,
  })}`;
  return useQuery<NotificationHistoryResponse>({
    queryKey: notificationKeys.historyList(filters, page),
    queryFn: () => api.getFullResponse<NotificationHistoryResponse>(endpoint),
    enabled: isAdmin,
    placeholderData: keepPreviousData,
  });
}

/** One row with its full events timeline — loaded when a row is expanded. */
export function useNotificationHistoryEntry(id: number | null) {
  const { isAdmin } = useAuth();
  return useQuery<NotificationHistoryDetail>({
    queryKey: notificationKeys.historyEntry(id ?? -1),
    queryFn: async () => {
      const entry = await api.get<NotificationHistoryDetail>(`/admin/notification-history/${id}`);
      return { ...entry, events: Array.isArray(entry.events) ? entry.events : ([] as NotificationEventRow[]) };
    },
    enabled: isAdmin && id !== null,
  });
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const encoded = header.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ""));
    } catch {
      // fall through to the plain filename
    }
  }
  const plain = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plain ? plain[1].trim() : null;
}

/**
 * Downloads the filtered history as CSV. Above 50 000 rows the API answers 422
 * with a Czech `message`; that message is thrown so the caller can show it
 * instead of saving an error page.
 */
export async function downloadNotificationHistoryExport(
  filters: NotificationHistoryFilters
): Promise<void> {
  // JSON first in Accept so a Laravel validation failure also answers in JSON.
  const response = await api.getRaw(
    `/admin/notification-history/export${historyQueryString(filters)}`,
    "application/json, text/csv"
  );

  if (!response.ok) {
    let message = `Export selhal (${response.status})`;
    const body = await response.json().catch(() => null);
    if (body && typeof body.message === "string" && body.message) {
      message = body.message;
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filenameFromDisposition(response.headers.get("content-disposition")) ??
    `notifikace-historie-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
