// Unified audit log (BR-BNNASY) — `GET /admin/audit-logs`, admin-only.

export type AuditActorRole =
  | "admin"
  | "teacher"
  | "student"
  | "guardian"
  | "api_key"
  | "system";

export type AuditSource = "admin" | "self_service" | "system";

export type AuditOutcome = "success" | "denied";

/** One changed field: the value before and after. Secrets arrive as `"[skryto]"`. */
export interface AuditDiffEntry {
  from: unknown;
  to: unknown;
}

export interface AuditLogEntry {
  id: number;
  created_at: string;
  /** May be set while `actor` is null — the account has since been deleted. */
  actor_id: number | null;
  /** Null for a deleted account, or when there was none (system job, API key, guardian). */
  actor: { id: number; name: string | null; email: string | null } | null;
  actor_role: AuditActorRole | string | null;
  /** Action key, e.g. `classroom.updated`. New keys appear over time. */
  action: string;
  outcome: AuditOutcome | string;
  target_type: string | null;
  target_id: number | null;
  scope: { school_id: number | null; classroom_id: number | null } | null;
  source: AuditSource | string | null;
  diff: Record<string, AuditDiffEntry> | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
}

export interface AuditLogMeta {
  total: number;
  page: number;
  per_page: number;
  last_page: number;
  /** Distinct action keys present in the log — feeds the action filter. */
  actions?: string[];
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  meta: AuditLogMeta;
}

/** Filters shared by the list and the export. Empty string = not filtered. */
export interface AuditLogFilters {
  /** Inclusive day, YYYY-MM-DD. */
  from: string;
  to: string;
  actor_id: string;
  actor_role: string;
  /** Exact key, or a `prefix.*` group. */
  action: string;
  target_type: string;
  target_id: string;
  school_id: string;
  classroom_id: string;
  source: string;
  outcome: string;
}

export type AuditExportFormat = "csv" | "json";
