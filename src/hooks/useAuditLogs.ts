import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  AuditExportFormat,
  AuditLogFilters,
  AuditLogResponse,
} from "@/types/audit-log";

export const AUDIT_LOG_FILTER_KEYS = [
  "from",
  "to",
  "actor_id",
  "actor_role",
  "action",
  "target_type",
  "target_id",
  "school_id",
  "classroom_id",
  "source",
  "outcome",
] as const satisfies readonly (keyof AuditLogFilters)[];

export const EMPTY_AUDIT_LOG_FILTERS: AuditLogFilters = {
  from: "",
  to: "",
  actor_id: "",
  actor_role: "",
  action: "",
  target_type: "",
  target_id: "",
  school_id: "",
  classroom_id: "",
  source: "",
  outcome: "",
};

export const AUDIT_LOG_PER_PAGE = 50;

/** Query string for the list and the export — the API takes the same names. */
export function auditLogQueryString(
  filters: AuditLogFilters,
  extra: Record<string, string | number> = {}
): string {
  const params = new URLSearchParams();
  for (const key of AUDIT_LOG_FILTER_KEYS) {
    const value = filters[key].trim();
    if (value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(extra)) params.set(key, String(value));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Unified audit log (BR-BNNASY). `/admin/audit-logs` is admin-only, so for a
 * signed-in teacher this stays idle instead of collecting a 403 — the same
 * guard useTeam() uses (BR-38FYMX).
 */
export function useAuditLogs(filters: AuditLogFilters, page: number) {
  const { isAdmin } = useAuth();
  const endpoint = `/admin/audit-logs${auditLogQueryString(filters, {
    page,
    per_page: AUDIT_LOG_PER_PAGE,
  })}`;

  return useQuery({
    queryKey: ["audit-logs", filters, page],
    queryFn: () => api.getFullResponse<AuditLogResponse>(endpoint),
    enabled: isAdmin,
    placeholderData: keepPreviousData,
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
 * Downloads the filtered log as CSV or JSON. The API refuses a result that is
 * too large with a 422 and a Czech `message`; that message is thrown as the
 * error so the caller can show it instead of saving an error page.
 */
export async function downloadAuditLogExport(
  filters: AuditLogFilters,
  format: AuditExportFormat
): Promise<void> {
  // JSON first in Accept so a Laravel validation failure also answers in JSON
  // (it redirects otherwise); the file itself is picked by `format`.
  const response = await api.getRaw(
    `/admin/audit-logs/export${auditLogQueryString(filters, { format })}`,
    format === "csv" ? "application/json, text/csv" : "application/json"
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
    `audit-log-${new Date().toISOString().slice(0, 10)}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
