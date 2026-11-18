// Labels and pure helpers for the notification admin (NOTIF-8/9/10,
// BR-QK6WW3). Contract: docs/superpowers/specs/2026-10-07-notification-system-design.md.
//
// The API keeps its enum values in English; everything shown to an admin goes
// through a label map here, and every lookup falls back to the raw key so a
// value the map does not know yet still shows up.
//
// Kept free of runtime imports so `npm test` can run its node:test suite
// straight off this file.

import type {
  BroadcastRole,
  BroadcastTargeting,
  BroadcastWarning,
  CatalogEvent,
  CatalogField,
  CatalogOperator,
  CatalogOption,
  CatalogRecipientField,
  DeepLinkOption,
  NotificationBroadcast,
  NotificationHistoryFilters,
  NotificationMeta,
  NotificationMetaResponse,
  NotificationRuleDefinition,
  NotificationRuleFilters,
  NotificationVariable,
  PathError,
  TemplateError,
  TemplateKey,
  TemplateValue,
} from "../types/notifications";

// ── Labels ───────────────────────────────────────────────────────────────────

export const NOTIFICATION_CATEGORY_LABELS: Record<string, string> = {
  provoz: "Provoz",
  navyk: "Návyk",
  pokrok: "Pokrok",
  aktivace: "Aktivace",
};

export const NOTIFICATION_CATEGORY_ORDER = Object.keys(NOTIFICATION_CATEGORY_LABELS);

/** A type's / rule's target role. */
export const NOTIFICATION_ROLE_LABELS: Record<string, string> = {
  student: "Studenti",
  teacher: "Učitelé",
  all: "Všichni",
};

/** A recipient's own account role (history). */
export const NOTIFICATION_USER_ROLE_LABELS: Record<string, string> = {
  student: "Student",
  teacher: "Učitel",
  admin: "Admin",
};

export const NOTIFICATION_CHANNEL_LABELS: Record<string, string> = {
  push: "Push",
  feed: "Novinky",
};

export const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  created: "Vytvořeno",
  queued: "Ve frontě",
  sent: "Odesláno",
  delivered: "Doručeno",
  viewed: "Zobrazeno",
  clicked: "Kliknuto",
  app_opened: "Otevřena aplikace",
  failed: "Selhalo",
};

export const PUSH_STATUS_LABELS: Record<string, string> = {
  deferred: "Odloženo",
  queued: "Ve frontě",
  sent: "Odesláno",
  delivered: "Doručeno",
  failed: "Selhalo",
  skipped: "Přeskočeno",
};

/** The history `result` filter: every status plus the two decision outcomes. */
export const NOTIFICATION_RESULT_LABELS: Record<string, string> = {
  ...NOTIFICATION_STATUS_LABELS,
  suppressed: "Potlačeno",
  deferred: "Odloženo (tiché hodiny)",
};

export const NOTIFICATION_SOURCE_LABELS: Record<string, string> = {
  rule: "Pravidlo",
  broadcast: "Rozesílka",
  test: "Test",
};

export const BROADCAST_STATUS_LABELS: Record<string, string> = {
  draft: "Koncept",
  sending: "Odesílá se",
  sent: "Odesláno",
  failed: "Selhalo",
  archived: "Archivováno",
};

/** `notification_events.event` — decisions and state transitions (§1.4). */
export const NOTIFICATION_EVENT_LABELS: Record<string, string> = {
  "decision.deliver": "Rozhodnutí: doručit",
  "decision.defer": "Rozhodnutí: odložit",
  "decision.suppress": "Rozhodnutí: potlačit",
  "decision.reject": "Rozhodnutí: odmítnout",
  created: "Vytvořeno",
  queued: "Zařazeno do fronty",
  sent: "Odesláno",
  delivered: "Doručeno",
  viewed: "Zobrazeno",
  clicked: "Kliknuto",
  app_opened: "Otevřena aplikace",
  failed: "Selhalo",
  target_action: "Cílová akce splněna",
};

/** Machine-readable decision reasons (§2.2). */
export const NOTIFICATION_REASON_LABELS: Record<string, string> = {
  user_not_found: "Uživatel neexistuje",
  user_deactivated: "Účet je deaktivovaný",
  user_merged: "Účet byl sloučen",
  role_mismatch: "Role neodpovídá typu",
  no_course_access: "Nemá přístup ke kurzu",
  no_classroom_access: "Nepatří do třídy",
  no_school_access: "Nepatří ke škole",
  type_inactive: "Typ je vypnutý",
  duplicate: "Duplicita",
  frequency_limit: "Frekvenční limit",
  category_daily_cap: "Denní limit kategorie",
  no_channels: "Žádný kanál",
  push_unavailable: "Push není nastavený",
  no_device: "Žádné zařízení",
  push_disabled_by_user: "Push vypnutý uživatelem",
  quiet_hours: "Tiché hodiny",
  queue_unavailable: "Fronta nedostupná",
};

export const RULE_OPERATOR_LABELS: Record<string, string> = {
  eq: "rovná se",
  neq: "nerovná se",
  gt: "větší než",
  gte: "větší nebo rovno",
  lt: "menší než",
  lte: "menší nebo rovno",
  in: "je jedno z",
  not_in: "není žádné z",
};

export const RULE_OPERATOR_SYMBOLS: Record<string, string> = {
  eq: "=",
  neq: "≠",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  in: "∈",
  not_in: "∉",
};

export const CATALOG_FIELD_TYPE_LABELS: Record<string, string> = {
  int: "celé číslo",
  string: "text",
  enum: "výčet",
};

/** What counts as the "cílová akce" of a type (§6.4). */
export const TARGET_ACTION_LABELS: Record<string, string> = {
  "learning.activity": "Učení v aplikaci",
  "quiz.completed": "Dokončený kvíz",
  "practice.reviewed": "Procvičování",
  "game.played": "Zahraná hra",
};

export const TEMPLATE_KEYS: TemplateKey[] = ["push_title", "push_body", "feed_title", "feed_body"];

export const TEMPLATE_LABELS: Record<string, string> = {
  push_title: "Push – titulek",
  push_body: "Push – text",
  feed_title: "Novinky – titulek",
  feed_body: "Novinky – text",
  deep_link: "Odkaz v aplikaci",
};

export function labelOr(map: Record<string, string>, key: string | null | undefined): string {
  if (key === null || key === undefined || key === "") return "—";
  return map[key] ?? key;
}

export const categoryLabel = (key: string | null | undefined) =>
  labelOr(NOTIFICATION_CATEGORY_LABELS, key);
export const roleLabel = (key: string | null | undefined) => labelOr(NOTIFICATION_ROLE_LABELS, key);
export const userRoleLabel = (key: string | null | undefined) =>
  labelOr(NOTIFICATION_USER_ROLE_LABELS, key);
export const channelLabel = (key: string | null | undefined) =>
  labelOr(NOTIFICATION_CHANNEL_LABELS, key);
export const statusLabel = (key: string | null | undefined) =>
  labelOr(NOTIFICATION_STATUS_LABELS, key);
export const pushStatusLabel = (key: string | null | undefined) => labelOr(PUSH_STATUS_LABELS, key);
export const resultLabel = (key: string | null | undefined) =>
  labelOr(NOTIFICATION_RESULT_LABELS, key);
export const sourceLabel = (key: string | null | undefined) =>
  labelOr(NOTIFICATION_SOURCE_LABELS, key);
export const broadcastStatusLabel = (key: string | null | undefined) =>
  labelOr(BROADCAST_STATUS_LABELS, key);
export const eventLabel = (key: string | null | undefined) =>
  labelOr(NOTIFICATION_EVENT_LABELS, key);
export const reasonLabel = (key: string | null | undefined) =>
  labelOr(NOTIFICATION_REASON_LABELS, key);
export const operatorLabel = (key: string | null | undefined) => labelOr(RULE_OPERATOR_LABELS, key);
export const templateLabel = (key: string | null | undefined) => labelOr(TEMPLATE_LABELS, key);
export const targetActionLabel = (key: string | null | undefined) =>
  labelOr(TARGET_ACTION_LABELS, key);

/** Channels in a stable order (push first) with labels joined. */
export function channelsLabel(channels: readonly string[] | null | undefined): string {
  if (!channels || channels.length === 0) return "—";
  const order = ["push", "feed"];
  return [...channels]
    .sort((a, b) => indexOrEnd(order, a) - indexOrEnd(order, b))
    .map((c) => channelLabel(c))
    .join(" + ");
}

function indexOrEnd(list: string[], key: string): number {
  const i = list.indexOf(key);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

/** Czech plural: 1 → one, 2–4 → few, else many. */
export function pluralCs(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n);
  if (abs === 1) return one;
  if (abs >= 2 && abs <= 4) return few;
  return many;
}

// ── Templates (§4) ───────────────────────────────────────────────────────────

const PLACEHOLDER = /\{\{\s*([^{}]*?)\s*\}\}/g;

/**
 * Variable names used in a template, in order of first use, each once.
 * Whitespace inside the braces is allowed (`{{ name }}`), as on the server.
 */
export function extractTemplateVariables(template: string | null | undefined): string[] {
  if (!template) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of Array.from(template.matchAll(PLACEHOLDER))) {
    const name = match[1].trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

/** Variables used in any of the templates that the type does not declare. */
export function unknownTemplateVariables(
  templates: readonly (string | null | undefined)[],
  declared: readonly string[]
): string[] {
  const known = new Set(declared);
  const out: string[] = [];
  for (const t of templates) {
    for (const name of extractTemplateVariables(t)) {
      if (!known.has(name) && !out.includes(name)) out.push(name);
    }
  }
  return out;
}

/** Required variables that none of the four templates uses (§4). */
export function missingRequiredVariables(
  templates: readonly (string | null | undefined)[],
  variables: readonly NotificationVariable[]
): string[] {
  const used = new Set(templates.flatMap((t) => extractTemplateVariables(t)));
  return variables.filter((v) => v.required && !used.has(v.key)).map((v) => v.key);
}

function isFilled(value: unknown): value is string | number | boolean {
  if (typeof value === "string") return value.trim() !== "";
  return typeof value === "number" || typeof value === "boolean";
}

/**
 * Local approximation of the server render (§4): declared value, else the
 * variable's fallback, else nothing — a raw `{{…}}` never shows. Used where the
 * preview endpoint cannot run (an unsaved broadcast).
 */
export function renderTemplatePreview(
  template: string | null | undefined,
  values: Record<string, TemplateValue | undefined>,
  variables: readonly Pick<NotificationVariable, "key" | "fallback">[] = []
): string {
  if (!template) return "";
  const fallbacks = new Map(variables.map((v) => [v.key, v.fallback ?? ""]));
  return template.replace(PLACEHOLDER, (_m, rawName: string) => {
    const name = rawName.trim();
    const value = values[name];
    if (isFilled(value)) return String(value);
    return fallbacks.get(name) ?? "";
  });
}

/**
 * Inserts `insertion` over the selection `[start, end)` of `text` and returns
 * the new text with the caret placed right after the insertion.
 */
export function insertAtCursor(
  text: string,
  start: number | null | undefined,
  end: number | null | undefined,
  insertion: string
): { text: string; cursor: number } {
  const from = clamp(start ?? text.length, 0, text.length);
  const to = clamp(end ?? from, from, text.length);
  return {
    text: text.slice(0, from) + insertion + text.slice(to),
    cursor: from + insertion.length,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export const DEFAULT_TEMPLATE_LIMITS: Record<TemplateKey, number> = {
  push_title: 65,
  push_body: 180,
  feed_title: 120,
  feed_body: 1000,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Character limits per template. The contract leaves `limits` open, so this
 * accepts the flat form (`{push_title: 65}`), the config form
 * (`{push: {title_max: 65}}`) and falls back to the config defaults (§1.9).
 */
export function resolveTemplateLimits(raw: unknown): Record<TemplateKey, number> {
  const out = { ...DEFAULT_TEMPLATE_LIMITS };
  if (!isRecord(raw)) return out;
  for (const key of TEMPLATE_KEYS) {
    const [channel, part] = key.split("_");
    const nested = raw[channel];
    const candidates = [
      raw[key],
      raw[`${key}_max`],
      isRecord(nested) ? nested[`${part}_max`] : undefined,
      isRecord(nested) ? nested[part] : undefined,
    ];
    for (const candidate of candidates) {
      const n = positiveNumber(candidate);
      if (n !== null) {
        out[key] = n;
        break;
      }
    }
  }
  return out;
}

// ── JSON editor ──────────────────────────────────────────────────────────────

export interface JsonErrorPosition {
  /** 1-based. */
  line: number;
  /** 1-based. */
  column: number;
  /** 0-based character offset. */
  offset: number;
  message: string;
}

/** 1-based line and column of a character offset. */
export function offsetToLineColumn(text: string, offset: number): { line: number; column: number } {
  const at = clamp(offset, 0, text.length);
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < at; i++) {
    if (text[i] === "\n") {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: at - lineStart + 1 };
}

// Plain fields, not parameter properties: `node --experimental-strip-types`
// only erases types and cannot compile those.
class JsonScanError {
  offset: number;
  message: string;
  constructor(offset: number, message: string) {
    this.offset = offset;
    this.message = message;
  }
}

/**
 * Strict JSON scanner that only locates the first error. Browsers word (and
 * position) JSON.parse errors differently — Safari gives no position at all —
 * so the location comes from here, not from the engine's message.
 */
function scanJson(text: string): { offset: number; message: string } | null {
  const n = text.length;
  let i = 0;

  const fail = (offset: number, message: string): never => {
    throw new JsonScanError(offset, message);
  };
  const describe = (offset: number) => (offset >= n ? "konec textu" : `znak „${text[offset]}“`);
  const isDigit = (ch: string | undefined) => ch !== undefined && ch >= "0" && ch <= "9";
  const skipWhitespace = () => {
    while (i < n && (text[i] === " " || text[i] === "\t" || text[i] === "\n" || text[i] === "\r")) i++;
  };

  function parseValue(): void {
    skipWhitespace();
    if (i >= n) fail(i, "Neočekávaný konec – chybí hodnota.");
    const ch = text[i];
    if (ch === "{") return parseObject();
    if (ch === "[") return parseArray();
    if (ch === '"') return parseString();
    if (ch === "-" || isDigit(ch)) return parseNumber();
    for (const literal of ["true", "false", "null"]) {
      if (text.startsWith(literal, i)) {
        i += literal.length;
        return;
      }
    }
    if (ch === "'") fail(i, "Řetězce a názvy musí být v dvojitých uvozovkách (\"), ne v apostrofech.");
    fail(i, `Neočekávaný ${describe(i)} – očekávána hodnota.`);
  }

  function parseObject(): void {
    i++; // {
    skipWhitespace();
    if (text[i] === "}") {
      i++;
      return;
    }
    for (;;) {
      skipWhitespace();
      if (i >= n) fail(i, "Neočekávaný konec – chybí „}“.");
      if (text[i] !== '"') {
        fail(i, `Očekáván název vlastnosti v dvojitých uvozovkách, nalezen ${describe(i)}.`);
      }
      parseString();
      skipWhitespace();
      if (text[i] !== ":") fail(i, `Za názvem vlastnosti chybí dvojtečka (nalezen ${describe(i)}).`);
      i++;
      parseValue();
      skipWhitespace();
      if (text[i] === ",") {
        const comma = i;
        i++;
        skipWhitespace();
        if (text[i] === "}") fail(comma, "Přebytečná čárka před „}“.");
        continue;
      }
      if (text[i] === "}") {
        i++;
        return;
      }
      if (i >= n) fail(i, "Neočekávaný konec – chybí „}“.");
      fail(i, `Chybí čárka nebo „}“ (nalezen ${describe(i)}).`);
    }
  }

  function parseArray(): void {
    i++; // [
    skipWhitespace();
    if (text[i] === "]") {
      i++;
      return;
    }
    for (;;) {
      parseValue();
      skipWhitespace();
      if (text[i] === ",") {
        const comma = i;
        i++;
        skipWhitespace();
        if (text[i] === "]") fail(comma, "Přebytečná čárka před „]“.");
        continue;
      }
      if (text[i] === "]") {
        i++;
        return;
      }
      if (i >= n) fail(i, "Neočekávaný konec – chybí „]“.");
      fail(i, `Chybí čárka nebo „]“ (nalezen ${describe(i)}).`);
    }
  }

  function parseString(): void {
    const start = i;
    i++; // opening quote
    while (i < n) {
      const ch = text[i];
      if (ch === '"') {
        i++;
        return;
      }
      if (ch === "\\") {
        const esc = text[i + 1];
        if (esc === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) {
            fail(i, "Neplatná sekvence \\u v řetězci (čekají se 4 šestnáctkové číslice).");
          }
          i += 6;
          continue;
        }
        if (esc !== undefined && '"\\/bfnrt'.includes(esc)) {
          i += 2;
          continue;
        }
        fail(i, "Neplatná escape sekvence v řetězci.");
      }
      if (ch === "\n" || ch === "\r") fail(i, "Řetězec není ukončený uvozovkami před koncem řádku.");
      if (ch < " ") fail(i, "Řetězec obsahuje nepovolený řídicí znak (např. tabulátor).");
      i++;
    }
    fail(start, "Řetězec není ukončený uvozovkami.");
  }

  function parseNumber(): void {
    const start = i;
    if (text[i] === "-") i++;
    if (text[i] === "0") {
      i++;
    } else if (isDigit(text[i])) {
      while (isDigit(text[i])) i++;
    } else {
      fail(start, "Neplatné číslo.");
    }
    if (text[i] === ".") {
      i++;
      if (!isDigit(text[i])) fail(i, "Neplatné číslo – za desetinnou tečkou chybí číslice.");
      while (isDigit(text[i])) i++;
    }
    if (text[i] === "e" || text[i] === "E") {
      i++;
      if (text[i] === "+" || text[i] === "-") i++;
      if (!isDigit(text[i])) fail(i, "Neplatné číslo – chybí exponent.");
      while (isDigit(text[i])) i++;
    }
  }

  try {
    skipWhitespace();
    if (i >= n) return { offset: 0, message: "JSON je prázdný." };
    parseValue();
    skipWhitespace();
    if (i < n) fail(i, `Za koncem JSON následuje ještě ${describe(i)}.`);
    return null;
  } catch (err) {
    if (err instanceof JsonScanError) return { offset: err.offset, message: err.message };
    throw err;
  }
}

/**
 * Where `text` stops being valid JSON, or null when JSON.parse accepts it.
 * JSON.parse decides validity; the location and the Czech message come from a
 * strict scanner, falling back to the engine's own "line/column" or
 * "position" wording if the two ever disagree.
 */
export function jsonErrorPosition(text: string): JsonErrorPosition | null {
  try {
    JSON.parse(text);
    return null;
  } catch (err) {
    const found = scanJson(text);
    if (found) {
      return { ...offsetToLineColumn(text, found.offset), offset: found.offset, message: found.message };
    }
    const message = err instanceof Error ? err.message : String(err);
    const lineColumn = /line (\d+) column (\d+)/i.exec(message);
    if (lineColumn) {
      const line = Number(lineColumn[1]);
      const column = Number(lineColumn[2]);
      const lines = text.split("\n");
      const offset = lines.slice(0, line - 1).reduce((sum, l) => sum + l.length + 1, 0) + column - 1;
      return { line, column, offset, message };
    }
    const position = /position (\d+)/i.exec(message);
    const offset = position ? Number(position[1]) : 0;
    return { ...offsetToLineColumn(text, offset), offset, message };
  }
}

/** Parsed JSON or undefined — for code that already showed the error. */
export function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// ── Rules (§3.2) ─────────────────────────────────────────────────────────────

/** Starting definition for a new custom rule. */
export function defaultRuleDefinition(
  eventKey = "",
  typeKey = "",
  targetRole = "student"
): NotificationRuleDefinition {
  return {
    when: { event: eventKey },
    if: [],
    then: { type: typeKey, target_role: targetRole, channels: ["feed"], delay_minutes: 0 },
  };
}

/** `definition.when.event` and `definition.then.type` of whatever was parsed. */
export function ruleEventAndType(definition: unknown): { event: string | null; type: string | null } {
  if (!isRecord(definition)) return { event: null, type: null };
  const when = definition.when;
  const then = definition.then;
  const event = isRecord(when) && typeof when.event === "string" ? when.event : null;
  const type = isRecord(then) && typeof then.type === "string" ? then.type : null;
  return { event, type };
}

/** Example values for an event's fields — the rule test panel's starting point. */
export function sampleFieldsForEvent(event: CatalogEvent | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!event) return out;
  for (const [name, field] of Object.entries(event.fields)) {
    if (field.enum && field.enum.length > 0) out[name] = field.enum[0];
    else if (field.type === "int") out[name] = 1;
    else out[name] = field.label || name;
  }
  return out;
}

// ── Catalog normalisation (`GET /admin/notifications/meta`) ──────────────────

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value !== "" ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function normalizeField(name: string, raw: unknown): CatalogField {
  if (typeof raw === "string") return { type: raw, label: name, required: true };
  if (!isRecord(raw)) return { type: "string", label: name, required: true };
  const enumValues = Array.isArray(raw.enum) ? raw.enum.map((v) => String(v)) : undefined;
  return {
    type: stringOr(raw.type, enumValues ? "enum" : "string"),
    label: stringOr(raw.label, name),
    ...(enumValues ? { enum: enumValues } : {}),
    required: raw.required === undefined ? true : Boolean(raw.required),
  };
}

function normalizeFields(raw: unknown): Record<string, CatalogField> {
  const out: Record<string, CatalogField> = {};
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (isRecord(item)) {
        const name = stringOr(item.name, stringOr(item.key, ""));
        if (name) out[name] = normalizeField(name, item);
      } else if (typeof item === "string") {
        out[item] = normalizeField(item, null);
      }
    }
  } else if (isRecord(raw)) {
    for (const [name, field] of Object.entries(raw)) out[name] = normalizeField(name, field);
  }
  return out;
}

function normalizeEvent(fallbackKey: string, raw: unknown): CatalogEvent | null {
  if (!isRecord(raw)) return null;
  const key = stringOr(raw.key, stringOr(raw.event_key, stringOr(raw.event, fallbackKey)));
  if (!key) return null;
  return {
    key,
    label: stringOr(raw.label, key),
    description: nullableString(raw.description),
    fields: normalizeFields(raw.fields),
    dedup: nullableString(raw.dedup),
    recipient: nullableString(raw.recipient),
  };
}

/**
 * Recipient properties (`user.xp` …) from either a list or a map keyed by
 * field name. Absent in an older API build — then there are none to offer.
 */
export function normalizeRecipientFields(raw: unknown): CatalogRecipientField[] {
  const entries: [string, unknown][] = Array.isArray(raw)
    ? raw.map((item) => [isRecord(item) ? stringOr(item.name, stringOr(item.key, "")) : "", item])
    : isRecord(raw)
      ? Object.entries(raw)
      : [];
  const out: CatalogRecipientField[] = [];
  for (const [name, item] of entries) {
    if (!name) continue;
    out.push({
      name,
      ...normalizeField(name, item),
      description: isRecord(item) ? nullableString(item.description) : null,
    });
  }
  return out;
}

/** Catalog events from either a list or a map keyed by event key. */
export function normalizeCatalogEvents(raw: unknown): CatalogEvent[] {
  const out: CatalogEvent[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const event = normalizeEvent("", item);
      if (event) out.push(event);
    }
  } else if (isRecord(raw)) {
    for (const [key, item] of Object.entries(raw)) {
      const event = normalizeEvent(key, item);
      if (event) out.push(event);
    }
  }
  return out;
}

/**
 * `{value, label}` options from a list of keys, a list of objects
 * (`key`/`value`/`path` + `label`/`name`) or a `{key: label}` map. Missing
 * labels come from `labels`, then the key itself.
 */
export function normalizeOptions(raw: unknown, labels: Record<string, string> = {}): CatalogOption[] {
  const out: CatalogOption[] = [];
  const push = (value: string, label: unknown) => {
    if (!value || out.some((o) => o.value === value)) return;
    out.push({ value, label: stringOr(label, labels[value] ?? value) });
  };
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string" || typeof item === "number") push(String(item), undefined);
      else if (isRecord(item)) {
        const value = stringOr(item.key, stringOr(item.value, stringOr(item.path, "")));
        push(value, item.label ?? item.name);
      }
    }
  } else if (isRecord(raw)) {
    for (const [key, value] of Object.entries(raw)) {
      push(key, typeof value === "string" ? value : isRecord(value) ? value.label : undefined);
    }
  }
  return out;
}

/**
 * Operators from the meta endpoint, in any of the shapes normalizeOptions
 * takes, plus `{field_type: [ops]}`. Falls back to the eight of §3.2.
 */
export function normalizeOperators(raw: unknown): CatalogOperator[] {
  // `{int: ["eq", …], string: ["eq", …]}` — operators grouped by field type.
  if (isRecord(raw) && Object.values(raw).every((v) => Array.isArray(v))) {
    const byOp = new Map<string, string[]>();
    for (const [fieldType, ops] of Object.entries(raw)) {
      for (const op of ops as unknown[]) {
        if (typeof op !== "string") continue;
        byOp.set(op, [...(byOp.get(op) ?? []), fieldType]);
      }
    }
    if (byOp.size > 0) {
      return Array.from(byOp.entries()).map(([value, types]) => ({
        value,
        label: RULE_OPERATOR_LABELS[value] ?? value,
        types,
      }));
    }
  }
  const options = normalizeOptions(raw, RULE_OPERATOR_LABELS).map((o) => {
    const extra = isRecord(raw) && isRecord(raw[o.value]) ? (raw[o.value] as Record<string, unknown>) : null;
    const types = extra && Array.isArray(extra.types) ? extra.types.map(String) : undefined;
    return types ? { ...o, types } : o;
  });
  if (options.length > 0) return options;
  return Object.entries(RULE_OPERATOR_LABELS).map(([value, label]) => ({ value, label }));
}

export function normalizeDeepLinks(raw: unknown): DeepLinkOption[] {
  return normalizeOptions(raw).map((o) => ({ path: o.value, label: o.label }));
}

export const DEFAULT_WIDE_THRESHOLD = 200;

/** `broadcast.wide_threshold` from wherever the meta endpoint puts it. */
export function resolveWideThreshold(meta: Pick<NotificationMetaResponse, "limits" | "defaults">): number {
  for (const source of [meta.limits, meta.defaults]) {
    if (!isRecord(source)) continue;
    const broadcast = source.broadcast;
    const candidates = [
      source.wide_threshold,
      source.broadcast_wide_threshold,
      isRecord(broadcast) ? broadcast.wide_threshold : undefined,
    ];
    for (const candidate of candidates) {
      const n = positiveNumber(candidate);
      if (n !== null) return n;
    }
  }
  return DEFAULT_WIDE_THRESHOLD;
}

export function normalizeNotificationMeta(raw: NotificationMetaResponse): NotificationMeta {
  const limitsSource = isRecord(raw.limits) ? raw.limits : {};
  return {
    events: normalizeCatalogEvents(raw.events),
    recipientFields: normalizeRecipientFields(raw.recipient_fields),
    operators: normalizeOperators(raw.operators),
    categories: normalizeOptions(raw.categories, NOTIFICATION_CATEGORY_LABELS),
    roles: normalizeOptions(raw.roles, NOTIFICATION_ROLE_LABELS),
    channels: normalizeOptions(raw.channels, NOTIFICATION_CHANNEL_LABELS),
    deepLinks: normalizeDeepLinks(raw.deep_links),
    limits: resolveTemplateLimits(
      // Limits may sit at the top level or under a `templates` key.
      isRecord(limitsSource.templates) ? limitsSource.templates : limitsSource
    ),
    wideThreshold: resolveWideThreshold(raw),
    raw,
  };
}

// ── Validation errors (422) ──────────────────────────────────────────────────

function errorsOf(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) return {};
  return isRecord(payload.errors) ? payload.errors : {};
}

/**
 * Rule-definition errors from a 422 body: `errors.definition = [{path,
 * message}]`, plain Laravel strings, and dotted keys such as
 * `errors["definition.when.event"]`.
 */
export function collectPathErrors(payload: unknown, field = "definition"): PathError[] {
  const errors = errorsOf(payload);
  const out: PathError[] = [];
  const own = errors[field];
  const list = Array.isArray(own) ? own : own === undefined ? [] : [own];
  for (const item of list) {
    if (typeof item === "string") out.push({ path: "$", message: item });
    else if (isRecord(item)) {
      out.push({
        path: stringOr(item.path, "$"),
        message: stringOr(item.message, "Neplatná hodnota."),
        ...(typeof item.line === "number" ? { line: item.line } : {}),
        ...(typeof item.column === "number" ? { column: item.column } : {}),
      });
    }
  }
  const prefix = `${field}.`;
  for (const [key, value] of Object.entries(errors)) {
    if (!key.startsWith(prefix)) continue;
    const messages = Array.isArray(value) ? value : [value];
    for (const message of messages) {
      if (typeof message === "string") out.push({ path: key.slice(prefix.length), message });
    }
  }
  return out;
}

/** Template errors from a 422 body (`errors.templates = [{template, code, message}]`). */
export function collectTemplateErrors(payload: unknown): TemplateError[] {
  const raw = errorsOf(payload).templates;
  if (!Array.isArray(raw)) return [];
  const out: TemplateError[] = [];
  for (const item of raw) {
    if (typeof item === "string") out.push({ template: "", code: "", message: item });
    else if (isRecord(item)) {
      out.push({
        template: stringOr(item.template, ""),
        code: stringOr(item.code, ""),
        message: stringOr(item.message, stringOr(item.code, "Neplatná šablona.")),
      });
    }
  }
  return out;
}

/**
 * Every other validation message, flattened to strings for a banner. Fields
 * in `exclude` (and their dotted children) are left to their own renderer.
 */
export function flattenValidationErrors(payload: unknown, exclude: readonly string[] = []): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(errorsOf(payload))) {
    if (exclude.some((field) => key === field || key.startsWith(`${field}.`))) continue;
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      if (typeof item === "string") out.push(item);
      else if (isRecord(item) && typeof item.message === "string") out.push(item.message);
    }
  }
  return Array.from(new Set(out));
}

/** A broadcast warning (string or `{code, message}`) as text. */
export function warningText(warning: BroadcastWarning): string {
  if (typeof warning === "string") return warning;
  return warning.message || warning.code || "";
}

// ── Broadcast targeting (§5.3) ───────────────────────────────────────────────

export const EMPTY_TARGETING: BroadcastTargeting = { school_ids: [], classroom_ids: [], roles: ["student"] };

/**
 * Whether a send needs the type-to-confirm phrase: at or above the threshold,
 * or whole schools (no class picked). The server's `wide` is authoritative;
 * this one answers before the estimate arrives.
 */
export function isWideTargeting(
  targeting: Pick<BroadcastTargeting, "classroom_ids">,
  recipientCount?: number | null,
  threshold: number = DEFAULT_WIDE_THRESHOLD
): boolean {
  if (targeting.classroom_ids.length === 0) return true;
  return typeof recipientCount === "number" && recipientCount >= threshold;
}

function toggleId(list: readonly number[], id: number): number[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

/** Toggles a school; leaving one also drops its classes (they must belong to a selected school). */
export function toggleTargetSchool(
  targeting: BroadcastTargeting,
  schoolId: number,
  classroomIdsOfSchool: readonly number[]
): BroadcastTargeting {
  const selected = targeting.school_ids.includes(schoolId);
  return {
    ...targeting,
    school_ids: toggleId(targeting.school_ids, schoolId),
    classroom_ids: selected
      ? targeting.classroom_ids.filter((id) => !classroomIdsOfSchool.includes(id))
      : targeting.classroom_ids,
  };
}

export function toggleTargetClassroom(targeting: BroadcastTargeting, classroomId: number): BroadcastTargeting {
  return { ...targeting, classroom_ids: toggleId(targeting.classroom_ids, classroomId) };
}

export function toggleTargetRole(targeting: BroadcastTargeting, role: BroadcastRole): BroadcastTargeting {
  const roles = targeting.roles.includes(role)
    ? targeting.roles.filter((r) => r !== role)
    : [...targeting.roles, role];
  const order: BroadcastRole[] = ["student", "teacher"];
  return { ...targeting, roles: order.filter((r) => roles.includes(r)) };
}

/**
 * Selected schools that will reach nobody: once any class is picked, only the
 * picked classes count — a selected school without a picked class drops out.
 */
export function schoolsWithoutSelectedClasses(
  targeting: BroadcastTargeting,
  classroomsBySchool: ReadonlyMap<number, readonly number[]>
): number[] {
  if (targeting.classroom_ids.length === 0) return [];
  return targeting.school_ids.filter((schoolId) => {
    const classes = classroomsBySchool.get(schoolId) ?? [];
    return !classes.some((id) => targeting.classroom_ids.includes(id));
  });
}

/** Client-side blockers before estimate/save/send. */
export function targetingProblems(targeting: BroadcastTargeting): string[] {
  const out: string[] = [];
  if (targeting.school_ids.length === 0) out.push("Vyberte alespoň jednu školu.");
  if (targeting.roles.length === 0) out.push("Vyberte alespoň jednu roli příjemců.");
  return out;
}

export function sameTargeting(a: BroadcastTargeting, b: BroadcastTargeting): boolean {
  const norm = (t: BroadcastTargeting) =>
    JSON.stringify([
      [...t.school_ids].sort((x, y) => x - y),
      [...t.classroom_ids].sort((x, y) => x - y),
      [...t.roles].sort(),
    ]);
  return norm(a) === norm(b);
}

// ── Broadcast progress ───────────────────────────────────────────────────────

export function percent(part: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((part / total) * 100)));
}

export function broadcastProgress(
  b: Pick<NotificationBroadcast, "processed_count" | "recipient_count">
): { processed: number; total: number; percent: number } {
  const total = b.recipient_count ?? 0;
  const processed = b.processed_count ?? 0;
  return { processed, total, percent: percent(processed, total) };
}

// ── Dates & durations ────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO timestamp → `<input type="datetime-local">` value in local time. */
export function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/** `<input type="datetime-local">` value (local time) → ISO timestamp, or null when empty/invalid. */
export function fromDateTimeLocalValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * A deadline the way `broadcast.deadline_approaching` words it ("d. m. Y H:i",
 * §3.3), in local time — `20. 10. 2026 08:30`. Empty for no/invalid date.
 */
export function formatDeadline(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

/** Queue age as Czech text: `45 s`, `12 min`, `2 h 5 min`, `3 d 4 h`. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "—";
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const minutes = Math.floor(s / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours} h ${rest} min` : `${hours} h`;
  }
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours ? `${days} d ${restHours} h` : `${days} d`;
}

// ── Query strings ────────────────────────────────────────────────────────────

export const HISTORY_FILTER_KEYS = [
  "from",
  "to",
  "user_id",
  "type",
  "channel",
  "result",
  "source",
  "broadcast_id",
  "is_test",
] as const satisfies readonly (keyof NotificationHistoryFilters)[];

export const EMPTY_HISTORY_FILTERS: NotificationHistoryFilters = {
  from: "",
  to: "",
  user_id: "",
  type: "",
  channel: "",
  result: "",
  source: "",
  broadcast_id: "",
  is_test: "",
};

export const RULE_FILTER_KEYS = ["event", "type", "active"] as const satisfies readonly (keyof NotificationRuleFilters)[];

export const EMPTY_RULE_FILTERS: NotificationRuleFilters = { event: "", type: "", active: "" };

/** `?a=1&b=2` from the non-empty values of `keys` plus `extra`, or "" when nothing is set. */
export function buildQueryString<T extends { [K in keyof T]: string }>(
  filters: T,
  keys: readonly (keyof T & string)[],
  extra: Record<string, string | number | null | undefined> = {}
): string {
  const params = new URLSearchParams();
  for (const key of keys) {
    const value = String(filters[key] ?? "").trim();
    if (value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(extra)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function historyQueryString(
  filters: NotificationHistoryFilters,
  extra: Record<string, string | number | null | undefined> = {}
): string {
  return buildQueryString(filters, HISTORY_FILTER_KEYS, extra);
}

export function readFilters<T extends { [K in keyof T]: string }>(
  params: URLSearchParams,
  keys: readonly (keyof T & string)[],
  empty: T
): T {
  const out: Record<string, string> = { ...empty };
  for (const key of keys) out[key] = params.get(key) ?? "";
  return out as T;
}
