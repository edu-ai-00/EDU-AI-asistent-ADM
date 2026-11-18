// Notification system admin (NOTIF-8/9/10, BR-QK6WW3).
//
// Shapes follow the binding contract in
// docs/superpowers/specs/2026-10-07-notification-system-design.md — §1 data
// model, §3.2 rule JSON, §3.3 event catalog, §5.2 admin endpoints and §5.3
// broadcast targeting. Every endpoint is admin-only.

export type NotificationCategory = "provoz" | "navyk" | "pokrok" | "aktivace";
export type NotificationTargetRole = "student" | "teacher" | "all";
export type NotificationChannel = "push" | "feed";
export type NotificationSource = "rule" | "broadcast" | "test";

/** Furthest state a notification reached (§2.3). */
export type NotificationStatus =
  | "created"
  | "queued"
  | "sent"
  | "delivered"
  | "viewed"
  | "clicked"
  | "app_opened"
  | "failed";

export type PushStatus = "deferred" | "queued" | "sent" | "delivered" | "failed" | "skipped";

/** History `result` filter: a status, or the two decision outcomes. */
export type NotificationResultFilter = NotificationStatus | "suppressed" | "deferred";

export type BroadcastStatus = "draft" | "sending" | "sent" | "failed" | "archived";
export type BroadcastRole = "student" | "teacher";

export type RuleOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "not_in";

/** The four editable texts of a type (NOTIF-5). */
export type TemplateKey = "push_title" | "push_body" | "feed_title" | "feed_body";
/** What the preview endpoint renders: the four texts plus the deep link. */
export type PreviewKey = TemplateKey | "deep_link";

export type TemplateValue = string | number | null;

// ── Types ────────────────────────────────────────────────────────────────────

/** One declared template variable; keys are fixed, the rest is admin-editable. */
export interface NotificationVariable {
  key: string;
  label: string;
  sample: TemplateValue;
  fallback: string | null;
  required: boolean;
}

export interface NotificationType {
  id: number;
  key: string;
  name: string;
  description: string | null;
  category: NotificationCategory | string;
  target_role: NotificationTargetRole | string;
  is_active: boolean;
  is_mandatory: boolean;
  is_system: boolean;
  manual_allowed: boolean;
  channels: NotificationChannel[];
  respect_quiet_hours: boolean;
  frequency_limit: number | null;
  frequency_period_hours: number | null;
  dedup_window_hours: number;
  push_title: string | null;
  push_body: string | null;
  feed_title: string | null;
  feed_body: string | null;
  variables: NotificationVariable[];
  deep_link: string | null;
  target_action: string | null;
  created_at?: string;
  updated_at?: string;
  /** List only. */
  rules_count?: number;
  last_sent_at?: string | null;
}

/** `PUT /admin/notification-types/{id}` — every key is optional. */
export interface NotificationTypeUpdate {
  name?: string;
  description?: string | null;
  category?: string;
  target_role?: string;
  is_active?: boolean;
  is_mandatory?: boolean;
  manual_allowed?: boolean;
  channels?: NotificationChannel[];
  respect_quiet_hours?: boolean;
  frequency_limit?: number | null;
  frequency_period_hours?: number | null;
  dedup_window_hours?: number;
  push_title?: string | null;
  push_body?: string | null;
  feed_title?: string | null;
  feed_body?: string | null;
  variables?: NotificationVariable[];
  deep_link?: string | null;
}

/** A template problem — 422 `errors.templates[]` and the preview's `errors[]`. */
export interface TemplateError {
  template: string;
  code: string;
  message: string;
}

export interface RenderedTemplates {
  push_title: string | null;
  push_body: string | null;
  feed_title: string | null;
  feed_body: string | null;
  deep_link?: string | null;
}

export interface NotificationPreviewInput {
  templates?: Partial<Record<PreviewKey, string | null>>;
  sample?: Record<string, TemplateValue>;
}

export interface NotificationTypePreview {
  rendered: RenderedTemplates;
  errors: TemplateError[];
  lengths: Partial<Record<TemplateKey, number>>;
  /** Shape not pinned by the contract — read through resolveTemplateLimits(). */
  limits: unknown;
}

/** One per-recipient decision returned by a test send. */
export interface NotificationDecision {
  user_id?: number | null;
  event?: string | null;
  decision?: string | null;
  reason?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface NotificationTypeTestInput {
  user_id: number;
  sample?: Record<string, TemplateValue>;
  channels?: NotificationChannel[];
}

export interface NotificationTestResult {
  notification_id: string | null;
  decisions: NotificationDecision[];
}

// ── Rules ────────────────────────────────────────────────────────────────────

export interface RuleCondition {
  field: string;
  op: RuleOperator | string;
  value: unknown;
}

/** §3.2 — stored verbatim, validated on every save. */
export interface NotificationRuleDefinition {
  when: { event: string };
  if: RuleCondition[];
  then: {
    type: string;
    target_role: NotificationTargetRole | string;
    channels: NotificationChannel[];
    delay_minutes: number;
  };
}

export interface NotificationRule {
  id: number;
  key: string | null;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  event_key: string;
  notification_type_id: number;
  definition: NotificationRuleDefinition;
  created_by?: number | null;
  updated_by?: number | null;
  created_at?: string;
  updated_at?: string;
  /** Present when the API eager-loads the type. */
  type?: { id: number; key: string; name: string } | null;
}

export interface NotificationRuleInput {
  name: string;
  description?: string | null;
  is_active: boolean;
  definition: unknown;
}

/** URL filters of the rules tab. Empty string = not filtered. */
export interface NotificationRuleFilters {
  event: string;
  /** Type key. */
  type: string;
  /** "1" | "0" | "". */
  active: string;
}

/** A rule-definition problem (`errors.definition[]`, validate endpoint). */
export interface PathError {
  path: string;
  message: string;
  line?: number;
  column?: number;
}

export interface RuleValidationResult {
  valid: boolean;
  errors: PathError[];
}

export interface RuleTestInput {
  fields: Record<string, unknown>;
  user_id?: number;
  send?: boolean;
}

export interface RuleConditionResult {
  field: string;
  op: string;
  value: unknown;
  actual: unknown;
  passed: boolean;
}

export interface RuleTestResult {
  matched: boolean;
  conditions: RuleConditionResult[];
  /** The rule has `user.*` conditions that need a user before they can be judged. */
  recipient_pending?: boolean;
  rendered: Partial<RenderedTemplates> | null;
  notification_id?: string | null;
  decisions?: NotificationDecision[];
}

// ── Catalog (`GET /admin/notifications/meta`) ────────────────────────────────

export interface CatalogField {
  /** `int`, `string` or `enum`. */
  type: string;
  label: string;
  enum?: string[];
  required: boolean;
}

export interface CatalogEvent {
  key: string;
  label: string;
  description: string | null;
  fields: Record<string, CatalogField>;
  /** e.g. `course_completed:{course_id}`. */
  dedup: string | null;
  recipient: string | null;
}

/** A property of the recipient a condition may use, e.g. `user.xp`. */
export interface CatalogRecipientField extends CatalogField {
  name: string;
  description: string | null;
}

export interface CatalogOption {
  value: string;
  label: string;
}

export interface CatalogOperator extends CatalogOption {
  /** Field types the operator applies to, when the API says. */
  types?: string[];
}

export interface DeepLinkOption {
  path: string;
  label: string;
}

/** Raw response — the contract leaves the inner shapes open. */
export interface NotificationMetaResponse {
  events: unknown;
  recipient_fields?: unknown;
  operators: unknown;
  categories: unknown;
  roles: unknown;
  channels: unknown;
  deep_links: unknown;
  limits: unknown;
  defaults: unknown;
}

/** Normalised by normalizeNotificationMeta(). */
export interface NotificationMeta {
  events: CatalogEvent[];
  recipientFields: CatalogRecipientField[];
  operators: CatalogOperator[];
  categories: CatalogOption[];
  roles: CatalogOption[];
  channels: CatalogOption[];
  deepLinks: DeepLinkOption[];
  limits: Record<TemplateKey, number>;
  wideThreshold: number;
  raw: NotificationMetaResponse;
}

export interface QueueHealth {
  pending: number;
  pending_notifications: number;
  failed: number;
  oldest_pending_seconds: number | null;
  deferred_push: number;
}

// ── Broadcasts (NOTIF-10) ────────────────────────────────────────────────────

/** §5.3. Empty `classroom_ids` = every class of the selected schools. */
export interface BroadcastTargeting {
  school_ids: number[];
  classroom_ids: number[];
  roles: BroadcastRole[];
}

export interface NotificationBroadcast {
  id: number;
  title: string;
  body: string;
  type_key: string;
  channels: NotificationChannel[];
  targeting: BroadcastTargeting;
  /** Names resolved at send; shape is the API's choice. */
  targeting_snapshot: Record<string, unknown> | null;
  deadline_at: string | null;
  status: BroadcastStatus | string;
  recipient_count: number;
  processed_count: number;
  delivered_count: number;
  suppressed_count: number;
  failed_count: number;
  /** Recipients who have seen it (viewed in the feed, or opened from the push). Grows after the send. */
  read_count: number;
  created_by?: number | null;
  updated_by?: number | null;
  sent_by?: number | null;
  sent_at: string | null;
  completed_at: string | null;
  archived_at: string | null;
  archived_by?: number | null;
  deadline_reminded_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationBroadcastInput {
  title: string;
  body: string;
  type_key: string;
  channels: NotificationChannel[];
  targeting: BroadcastTargeting;
  deadline_at?: string | null;
}

export type BroadcastWarning = string | { code?: string; message?: string };

export interface BroadcastEstimate {
  recipient_count: number;
  by_role: Partial<Record<BroadcastRole, number>>;
  wide: boolean;
  warnings: BroadcastWarning[];
}

export interface BroadcastPreview {
  recipient_count: number;
  wide: boolean;
  rendered: RenderedTemplates;
  warnings: BroadcastWarning[];
}

// ── History (NOTIF-8) ────────────────────────────────────────────────────────

export interface NotificationHistoryUser {
  id: number;
  name: string | null;
  email: string | null;
  role: string | null;
}

export interface NotificationHistoryRow {
  id: number;
  notification_id: string;
  user: NotificationHistoryUser | null;
  type_key: string;
  type_name: string | null;
  source: NotificationSource | string;
  channels: NotificationChannel[];
  status: NotificationStatus | string;
  push_status: PushStatus | string | null;
  title: string | null;
  deep_link: string | null;
  failure_reason: string | null;
  is_test: boolean;
  created_at: string;
  queued_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  viewed_at: string | null;
  clicked_at: string | null;
  app_opened_at: string | null;
  failed_at: string | null;
  target_action_at: string | null;
}

/** A `notification_events` row — what `result=suppressed` lists instead. */
export interface NotificationEventRow {
  id: number;
  notification_id?: number | string | null;
  user_id: number | null;
  user?: NotificationHistoryUser | null;
  type_key: string | null;
  rule_id?: number | null;
  broadcast_id?: number | null;
  event: string;
  reason: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface NotificationHistoryDetail extends NotificationHistoryRow {
  body?: string | null;
  push_title?: string | null;
  push_body?: string | null;
  payload?: Record<string, unknown> | null;
  events: NotificationEventRow[];
}

export interface NotificationHistorySummary {
  total: number;
  delivered: number;
  viewed: number;
  clicked: number;
  app_opened: number;
  failed: number;
}

export interface NotificationHistoryMeta {
  total: number;
  page: number;
  per_page: number;
  last_page: number;
  summary?: NotificationHistorySummary;
}

export interface NotificationHistoryResponse {
  data: (NotificationHistoryRow | NotificationEventRow)[];
  meta: NotificationHistoryMeta;
}

/** Filters shared by the list and the export. Empty string = not filtered. */
export interface NotificationHistoryFilters {
  /** Inclusive local day, YYYY-MM-DD. */
  from: string;
  to: string;
  user_id: string;
  /** Type key. */
  type: string;
  channel: string;
  result: string;
  source: string;
  broadcast_id: string;
  /** "1" | "0" | "". */
  is_test: string;
}
