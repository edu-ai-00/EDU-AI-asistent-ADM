"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ChevronDown, Lock, Play, Plus, Send, Trash2, Wand2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { UserSearchPicker } from "@/components/admin/UserSearchPicker";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreateNotificationRule,
  useDeleteNotificationRule,
  useNotificationMeta,
  useNotificationRule,
  useNotificationRuleAudit,
  useNotificationTypes,
  useTestNotificationRule,
  useUpdateNotificationRule,
  useValidateNotificationRule,
} from "@/hooks/useNotifications";
import {
  CATALOG_FIELD_TYPE_LABELS,
  RULE_OPERATOR_SYMBOLS,
  channelsLabel,
  collectPathErrors,
  defaultRuleDefinition,
  eventLabel,
  jsonErrorPosition,
  labelOr,
  operatorLabel,
  reasonLabel,
  roleLabel,
  ruleEventAndType,
  sampleFieldsForEvent,
  tryParseJson,
  type JsonErrorPosition,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/types/api";
import type {
  CatalogEvent,
  CatalogOperator,
  CatalogRecipientField,
  NotificationRule,
  NotificationType,
  PathError,
  RuleTestResult,
  RuleValidationResult,
} from "@/types/notifications";
import {
  ActivePill,
  AdminOnlyNotice,
  AuditHistoryList,
  BackLink,
  Banner,
  CheckboxRow,
  Field,
  PathErrorList,
  Pill,
  SectionCard,
  errorLines,
  errorMessage,
  errorPayload,
  inputClass,
  monoTextareaClass,
} from "./shared";

const RULES_HREF = "/admin/notifications?tab=rules";

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function childObject(parent: JsonObject, key: string): JsonObject {
  const existing = parent[key];
  if (isObject(existing)) return existing;
  const created: JsonObject = {};
  parent[key] = created;
  return created;
}

interface RuleForm {
  name: string;
  description: string;
  isActive: boolean;
  definitionText: string;
}

function toForm(rule: NotificationRule): RuleForm {
  return {
    name: rule.name ?? "",
    description: rule.description ?? "",
    isActive: Boolean(rule.is_active),
    definitionText: pretty(rule.definition),
  };
}

const NEW_FORM: RuleForm = {
  name: "",
  description: "",
  isActive: false,
  definitionText: pretty(defaultRuleDefinition()),
};

// ── JSON error display ───────────────────────────────────────────────────────

function JsonErrorNotice({ text, error, label }: { text: string; error: JsonErrorPosition; label: string }) {
  const line = text.split("\n")[error.line - 1] ?? "";
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          {label} — řádek {error.line}, sloupec {error.column}: {error.message}
        </span>
      </div>
      {line.trim() !== "" && (
        <pre className="mt-1.5 overflow-x-auto rounded bg-white/70 px-2 py-1 font-mono text-xs leading-5 text-gray-800">
          {line}
          {"\n"}
          <span className="text-red-600">{" ".repeat(Math.max(0, error.column - 1))}^</span>
        </pre>
      )}
    </div>
  );
}

/** Tab inserts two spaces instead of leaving the field. */
function handleTabKey(e: React.KeyboardEvent<HTMLTextAreaElement>, onChange: (value: string) => void) {
  if (e.key !== "Tab" || e.shiftKey || e.altKey || e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  const el = e.currentTarget;
  const { selectionStart, selectionEnd, value } = el;
  const next = `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`;
  onChange(next);
  requestAnimationFrame(() => el.setSelectionRange(selectionStart + 2, selectionStart + 2));
}

// ── Catalog panel ────────────────────────────────────────────────────────────

function CatalogPanel({
  events,
  recipientFields,
  operators,
  types,
  currentEvent,
  currentType,
  locked,
  canEdit,
  onUseEvent,
  onAddCondition,
  onAddRecipientCondition,
  onUseType,
}: {
  events: CatalogEvent[];
  recipientFields: CatalogRecipientField[];
  operators: CatalogOperator[];
  types: NotificationType[];
  currentEvent: string | null;
  currentType: string | null;
  locked: boolean;
  canEdit: boolean;
  onUseEvent: (key: string) => void;
  onAddCondition: (event: CatalogEvent, field: string) => void;
  onAddRecipientCondition: (field: CatalogRecipientField) => void;
  onUseType: (type: NotificationType) => void;
}) {
  return (
    <aside className="rounded-lg border border-gray-200 bg-gray-50 text-sm md:max-h-[640px] md:overflow-y-auto">
      <div className="px-3 py-2 border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Katalog
      </div>

      <div className="px-3 py-2">
        <p className="text-xs font-medium text-gray-600 mb-1">Události</p>
        {events.length === 0 && <p className="text-xs text-gray-400">Katalog se načítá…</p>}
        <div className="space-y-1">
          {events.map((event) => {
            const current = event.key === currentEvent;
            return (
              <details
                key={event.key}
                open={current || undefined}
                className={cn("rounded-md border bg-white", current ? "border-blue-300" : "border-gray-200")}
              >
                <summary className="cursor-pointer list-none px-2 py-1.5">
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-gray-900 text-xs font-medium">{event.label}</span>
                    <ChevronDown className="w-3 h-3 mt-0.5 text-gray-400 flex-shrink-0" />
                  </div>
                  <code className="block font-mono text-[11px] text-gray-500 break-all">{event.key}</code>
                </summary>
                <div className="px-2 pb-2 space-y-1.5 text-xs">
                  {event.description && <p className="text-gray-600">{event.description}</p>}
                  {event.recipient && (
                    <p className="text-gray-500">
                      <span className="font-medium">Příjemci:</span> {event.recipient}
                    </p>
                  )}
                  {event.dedup && (
                    <p className="text-gray-500">
                      <span className="font-medium">Dedup:</span> <code className="font-mono">{event.dedup}</code>
                    </p>
                  )}
                  {Object.keys(event.fields).length > 0 && (
                    <ul className="space-y-1">
                      {Object.entries(event.fields).map(([name, field]) => (
                        <li key={name} className="flex items-start justify-between gap-1">
                          <span className="min-w-0">
                            <code className="font-mono text-gray-800">{name}</code>{" "}
                            <span className="text-gray-400">
                              {labelOr(CATALOG_FIELD_TYPE_LABELS, field.type)}
                              {!field.required && ", nepovinné"}
                            </span>
                            {field.enum && (
                              <span className="block text-gray-500 break-all">{field.enum.join(" | ")}</span>
                            )}
                          </span>
                          {current && canEdit && (
                            <button
                              type="button"
                              title="Přidat podmínku na toto pole"
                              onClick={() => onAddCondition(event, name)}
                              className="flex-shrink-0 rounded p-0.5 text-blue-600 hover:bg-blue-50"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!current && !locked && canEdit && (
                    <button
                      type="button"
                      onClick={() => onUseEvent(event.key)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      Použít v pravidle
                    </button>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>

      {recipientFields.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-600 mb-1">Vlastnosti příjemce</p>
          <p className="mb-1 text-[11px] text-gray-400">
            Podmínka na tato pole neomezuje událost, ale komu se notifikace pošle — platí u každé události.
          </p>
          <ul className="space-y-1 text-xs">
            {recipientFields.map((field) => (
              <li key={field.name} className="flex items-start justify-between gap-1">
                <span className="min-w-0">
                  <code className="font-mono text-gray-800">{field.name}</code>{" "}
                  <span className="text-gray-400">{labelOr(CATALOG_FIELD_TYPE_LABELS, field.type)}</span>
                  <span className="block text-gray-500">{field.description ?? field.label}</span>
                </span>
                {canEdit && (
                  <button
                    type="button"
                    title="Přidat podmínku na tuto vlastnost"
                    onClick={() => onAddRecipientCondition(field)}
                    className="flex-shrink-0 rounded p-0.5 text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="px-3 py-2 border-t border-gray-200">
        <p className="text-xs font-medium text-gray-600 mb-1">Operátory</p>
        <ul className="space-y-0.5 text-xs">
          {operators.map((op) => (
            <li key={op.value} className="flex items-baseline gap-1.5">
              <code className="font-mono text-gray-800 w-12 flex-shrink-0">{op.value}</code>
              <span className="text-gray-600">
                {RULE_OPERATOR_SYMBOLS[op.value] ? `${RULE_OPERATOR_SYMBOLS[op.value]} ` : ""}
                {op.label}
                {op.types && op.types.length > 0 && (
                  <span className="text-gray-400"> ({op.types.map((t) => labelOr(CATALOG_FIELD_TYPE_LABELS, t)).join(", ")})</span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-[11px] text-gray-400">Číselné porovnání jen u celých čísel; in / not_in berou pole.</p>
      </div>

      <div className="px-3 py-2 border-t border-gray-200">
        <p className="text-xs font-medium text-gray-600 mb-1">Typy notifikací</p>
        <ul className="space-y-1 text-xs">
          {types.map((type) => {
            const current = type.key === currentType;
            return (
              <li
                key={type.id}
                className={cn("rounded-md border bg-white px-2 py-1", current ? "border-blue-300" : "border-gray-200")}
              >
                <div className="text-gray-900">{type.name}</div>
                <code className="block font-mono text-[11px] text-gray-500 break-all">{type.key}</code>
                <div className="text-[11px] text-gray-400">
                  {roleLabel(type.target_role)} · {channelsLabel(type.channels)}
                  {!type.is_active && " · vypnutý"}
                </div>
                {!current && !locked && canEdit && (
                  <button
                    type="button"
                    onClick={() => onUseType(type)}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-800"
                  >
                    Použít v pravidle
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

// ── Test panel ───────────────────────────────────────────────────────────────

function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function RuleTestPanel({
  ruleId,
  event,
  dirty,
}: {
  ruleId: number;
  event: CatalogEvent | null;
  dirty: boolean;
}) {
  const testMutation = useTestNotificationRule(ruleId);
  const [fieldsText, setFieldsText] = useState(() => pretty(sampleFieldsForEvent(event)));
  const [touched, setTouched] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [result, setResult] = useState<(RuleTestResult & { sent: boolean }) | null>(null);
  const [error, setError] = useState<unknown>(null);

  // Follow the catalog until the admin types their own values.
  useEffect(() => {
    if (!touched) setFieldsText(pretty(sampleFieldsForEvent(event)));
  }, [event, touched]);

  const jsonError = useMemo(() => jsonErrorPosition(fieldsText), [fieldsText]);
  const parsed = jsonError ? undefined : tryParseJson(fieldsText);
  const fieldsProblem = !jsonError && !isObject(parsed) ? "Hodnoty polí musí být JSON objekt." : null;

  const run = async (send: boolean) => {
    if (!isObject(parsed)) return;
    setError(null);
    setResult(null);
    try {
      const res = await testMutation.mutateAsync({
        fields: parsed,
        ...(user ? { user_id: user.id } : {}),
        send,
      });
      setResult({
        matched: Boolean(res?.matched),
        conditions: res?.conditions ?? [],
        recipient_pending: Boolean(res?.recipient_pending),
        rendered: res?.rendered ?? null,
        notification_id: res?.notification_id ?? null,
        decisions: res?.decisions ?? [],
        sent: send,
      });
    } catch (err) {
      setError(err);
    }
  };

  const running = testMutation.isPending;
  const rendered = result?.rendered;

  return (
    <SectionCard
      title="Test pravidla"
      description="Vyhodnotí podmínky uloženého pravidla nad zadanými hodnotami polí události. „Odeslat test“ navíc pošle vybranému uživateli testovací notifikaci."
    >
      {dirty && <Banner tone="warning">Test pracuje s uloženou verzí pravidla — neuložené změny se neprojeví.</Banner>}
      <Field
        label="Hodnoty polí události (JSON)"
        hint={
          <button
            type="button"
            onClick={() => {
              setTouched(false);
              setFieldsText(pretty(sampleFieldsForEvent(event)));
            }}
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
          >
            <Wand2 className="w-3 h-3" />
            Vyplnit vzorem z katalogu
          </button>
        }
      >
        <textarea
          rows={6}
          spellCheck={false}
          className={cn(monoTextareaClass, jsonError || fieldsProblem ? "border-red-300" : "border-gray-300")}
          value={fieldsText}
          onKeyDown={(e) =>
            handleTabKey(e, (v) => {
              setTouched(true);
              setFieldsText(v);
            })
          }
          onChange={(e) => {
            setTouched(true);
            setFieldsText(e.target.value);
          }}
        />
      </Field>
      {jsonError && <JsonErrorNotice text={fieldsText} error={jsonError} label="Neplatný JSON" />}
      {fieldsProblem && <Banner tone="error">{fieldsProblem}</Banner>}

      <UserSearchPicker label="Uživatel (nepovinné, nutné pro odeslání)" value={user} onChange={setUser} />

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => run(false)} disabled={!isObject(parsed) || running}>
          <Play className="w-4 h-4" />
          Vyhodnotit
        </Button>
        <Button onClick={() => run(true)} disabled={!isObject(parsed) || !user || running} isLoading={running}>
          {!running && <Send className="w-4 h-4" />}
          Odeslat test
        </Button>
      </div>

      {error !== null && (
        <Banner tone="error" lines={errorLines(error, "Test se nepodařilo spustit")} onClose={() => setError(null)} />
      )}

      {result && (
        <div className="space-y-3">
          {result.matched ? (
            <Banner tone="success">Podmínky jsou splněné — pravidlo by notifikaci poslalo.</Banner>
          ) : (
            <Banner tone="warning">Podmínky nejsou splněné — pravidlo by nic neposlalo.</Banner>
          )}

          {result.recipient_pending && (
            <Banner tone="warning">
              Pravidlo má i podmínky na příjemce (např. XP). Ty se vyhodnotí až po výběru uživatele — v tabulce níže jsou
              zatím jen podmínky události.
            </Banner>
          )}

          {result.conditions.length > 0 ? (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Pole</th>
                    <th className="px-2 py-1.5 font-medium">Operátor</th>
                    <th className="px-2 py-1.5 font-medium">Hodnota</th>
                    <th className="px-2 py-1.5 font-medium">Skutečnost</th>
                    <th className="px-2 py-1.5 font-medium">Výsledek</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.conditions.map((c, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5 font-mono text-gray-800">{c.field}</td>
                      <td className="px-2 py-1.5 text-gray-600" title={operatorLabel(c.op)}>
                        <code className="font-mono">{c.op}</code>
                      </td>
                      <td className="px-2 py-1.5 font-mono text-gray-700 break-all">{formatValue(c.value)}</td>
                      <td className="px-2 py-1.5 font-mono text-gray-700 break-all">{formatValue(c.actual)}</td>
                      <td className="px-2 py-1.5">
                        {c.passed ? (
                          <span className="inline-flex items-center gap-1 text-green-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> splněno
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700">
                            <XCircle className="w-3.5 h-3.5" /> nesplněno
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Pravidlo nemá žádné podmínky.</p>
          )}

          {rendered && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1">Push</div>
                <div className="font-semibold text-gray-900 break-words">{rendered.push_title || "—"}</div>
                <div className="text-gray-700 whitespace-pre-wrap break-words">{rendered.push_body || "—"}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1">Novinky</div>
                <div className="font-semibold text-gray-900 break-words">{rendered.feed_title || "—"}</div>
                <div className="text-gray-700 whitespace-pre-wrap break-words">{rendered.feed_body || "—"}</div>
                {rendered.deep_link && (
                  <div className="mt-1 font-mono text-[11px] text-blue-600 break-all">{rendered.deep_link}</div>
                )}
              </div>
            </div>
          )}

          {result.sent &&
            (result.notification_id ? (
              <Banner tone="success">
                Testovací notifikace odeslána. ID: <code className="font-mono text-xs">{result.notification_id}</code>
              </Banner>
            ) : (
              <Banner tone="warning">Testovací notifikace nevznikla.</Banner>
            ))}
          {(result.decisions ?? []).length > 0 && (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white text-sm">
              {(result.decisions ?? []).map((d, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-2 px-3 py-1.5">
                  <span className="text-gray-900">{eventLabel(d.event ?? d.decision ?? null)}</span>
                  {d.reason && <span className="text-gray-600">· {reasonLabel(d.reason)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

/**
 * Rule detail / new rule (NOTIF-9). The definition is edited as JSON (§3.2):
 * JSON.parse problems show inline with line and column before anything is
 * sent, „Ověřit“ asks the API for the semantic check, the side panel lists the
 * event catalog. System rules keep their event and type and cannot be deleted.
 */
export function NotificationRuleEditor({ ruleId }: { ruleId: number | null }) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const isNew = ruleId === null;

  const { data: rule, isLoading, error: loadError } = useNotificationRule(ruleId);
  const { data: meta } = useNotificationMeta();
  const { data: types } = useNotificationTypes();
  const audit = useNotificationRuleAudit(ruleId);

  const createMutation = useCreateNotificationRule();
  const updateMutation = useUpdateNotificationRule(ruleId ?? -1);
  const deleteMutation = useDeleteNotificationRule();
  const validateMutation = useValidateNotificationRule();

  const [base, setBase] = useState<NotificationRule | null>(null);
  const [form, setForm] = useState<RuleForm>(NEW_FORM);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const [validation, setValidation] = useState<RuleValidationResult | null>(null);
  const [validationError, setValidationError] = useState<unknown>(null);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  const baseForm = useMemo(() => (base ? toForm(base) : NEW_FORM), [base]);
  const dirty = isNew || JSON.stringify(form) !== JSON.stringify(baseForm);

  useEffect(() => {
    if (!rule) return;
    if (!base || !dirty) {
      setBase(rule);
      setForm(toForm(rule));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rule]);

  const jsonError = useMemo(() => jsonErrorPosition(form.definitionText), [form.definitionText]);
  const parsed = useMemo(
    () => (jsonError ? undefined : tryParseJson(form.definitionText)),
    [jsonError, form.definitionText]
  );
  const { event: parsedEvent, type: parsedType } = ruleEventAndType(parsed);

  const events = meta?.events ?? [];
  const lockedEvent = base?.is_system ? base.definition?.when?.event ?? base.event_key : null;
  const lockedType = base?.is_system ? base.definition?.then?.type ?? null : null;

  // The catalog follows the editor; while the JSON is broken it stays on the saved event.
  const currentEvent = parsedEvent ?? base?.definition?.when?.event ?? null;
  const catalogEvent = events.find((e) => e.key === currentEvent) ?? null;
  const savedEvent = events.find((e) => e.key === (base?.definition?.when?.event ?? base?.event_key)) ?? null;

  const saveDefinitionErrors: PathError[] = useMemo(
    () => collectPathErrors(errorPayload(saveError), "definition"),
    [saveError]
  );

  if (!isAdmin) return <AdminOnlyNotice />;
  if (!isNew && isLoading) return <LoadingPage message="Načítám pravidlo…" />;
  if (!isNew && (loadError || !rule || !base)) {
    if (!loadError && rule && !base) return <LoadingPage message="Načítám pravidlo…" />;
    return (
      <div>
        <BackLink href={RULES_HREF}>Pravidla</BackLink>
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <p className="text-gray-600">Pravidlo se nepodařilo načíst</p>
          <p className="text-sm text-gray-400">{errorMessage(loadError, "Pravidlo nenalezeno")}</p>
        </div>
      </div>
    );
  }

  const update = (patch: Partial<RuleForm>) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, ...patch }));
  };
  const setDefinitionText = (definitionText: string) => {
    setValidation(null);
    update({ definitionText });
  };

  /** Edits the parsed definition in place; no-op while the JSON is broken. */
  const patchDefinition = (mutate: (definition: JsonObject) => void) => {
    const current = tryParseJson(form.definitionText);
    if (!isObject(current)) return;
    mutate(current);
    setDefinitionText(pretty(current));
  };

  const applyEvent = (key: string) =>
    patchDefinition((d) => {
      childObject(d, "when").event = key;
      // Conditions belong to the old event's fields — except the ones about
      // the recipient, which mean the same under any event.
      d.if = (Array.isArray(d.if) ? d.if : []).filter(
        (c) => isObject(c) && typeof c.field === "string" && c.field.startsWith("user.")
      );
    });
  const applyType = (type: NotificationType) =>
    patchDefinition((d) => {
      const then = childObject(d, "then");
      then.type = type.key;
      then.target_role = type.target_role;
      then.channels = [...type.channels];
      if (typeof then.delay_minutes !== "number") then.delay_minutes = 0;
    });
  const addCondition = (event: CatalogEvent, field: string) =>
    patchDefinition((d) => {
      const conditions = Array.isArray(d.if) ? d.if : [];
      const sample = sampleFieldsForEvent(event)[field];
      conditions.push({ field, op: "eq", value: sample });
      d.if = conditions;
    });
  const addRecipientCondition = (field: CatalogRecipientField) =>
    patchDefinition((d) => {
      const conditions = Array.isArray(d.if) ? d.if : [];
      // A range is what these are for, so the first half of one is the seed.
      conditions.push({ field: field.name, op: "gte", value: field.type === "int" ? 0 : "" });
      d.if = conditions;
    });

  const lockProblem =
    base?.is_system && parsed !== undefined && (parsedEvent !== lockedEvent || parsedType !== lockedType)
      ? `U systémového pravidla nelze měnit událost (${lockedEvent}) ani typ (${lockedType}).`
      : null;
  const definitionProblem = jsonError
    ? "Definice není platný JSON."
    : !isObject(parsed)
      ? "Definice musí být JSON objekt."
      : lockProblem;
  const nameProblem = form.name.trim() ? null : "Název je povinný.";
  const canSave = !definitionProblem && !nameProblem && (isNew || dirty);

  const handleValidate = async () => {
    if (!isObject(parsed)) return;
    setValidation(null);
    setValidationError(null);
    try {
      const result = await validateMutation.mutateAsync(parsed);
      setValidation({ valid: Boolean(result?.valid), errors: result?.errors ?? [] });
    } catch (err) {
      setValidationError(err);
    }
  };

  const handleSave = async () => {
    if (!canSave || !isObject(parsed)) return;
    setSaveError(null);
    setSaved(false);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      is_active: form.isActive,
      definition: parsed,
    };
    try {
      if (isNew) {
        const created = await createMutation.mutateAsync(payload);
        router.replace(`/admin/notifications/rules/${created.id}`);
        return;
      }
      const updated = await updateMutation.mutateAsync(payload);
      setBase(updated);
      setForm(toForm(updated));
      setSaved(true);
    } catch (err) {
      setSaveError(err);
    }
  };

  const handleDelete = async () => {
    if (!base || base.is_system) return;
    if (!confirm(`Opravdu smazat pravidlo „${base.name}“?`)) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(base.id);
      router.push(RULES_HREF);
    } catch (err) {
      setDeleteError(err);
    }
  };

  const handleFormat = () => {
    if (isObject(parsed) || Array.isArray(parsed)) setDefinitionText(pretty(parsed));
  };

  const saving = createMutation.isPending || updateMutation.isPending;
  const title = isNew ? "Nové pravidlo" : base?.name || "Pravidlo";
  const lockedEventLabel = events.find((e) => e.key === lockedEvent)?.label;
  const lockedTypeName = (types ?? []).find((t) => t.key === lockedType)?.name;

  return (
    <div className="space-y-6">
      <div>
        <BackLink href={RULES_HREF}>Pravidla</BackLink>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {!isNew && base && (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {base.key && <code className="font-mono text-sm text-gray-500">{base.key}</code>}
                <ActivePill active={base.is_active} />
                {base.is_system && (
                  <Pill className="bg-purple-50 text-purple-700">
                    <Lock className="w-3 h-3" />
                    Systémové
                  </Pill>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isNew && base && !base.is_system && (
              <Button variant="ghost" size="sm" onClick={handleDelete} isLoading={deleteMutation.isPending}>
                {!deleteMutation.isPending && <Trash2 className="w-4 h-4" />}
                Smazat
              </Button>
            )}
            <Button onClick={handleSave} isLoading={saving} disabled={!canSave} title={definitionProblem ?? nameProblem ?? undefined}>
              {isNew ? "Vytvořit pravidlo" : "Uložit změny"}
            </Button>
          </div>
        </div>
      </div>

      {saved && !dirty && <Banner tone="success" onClose={() => setSaved(false)}>Pravidlo je uložené.</Banner>}
      {deleteError !== null && (
        <Banner tone="error" lines={errorLines(deleteError, "Pravidlo se nepodařilo smazat")} onClose={() => setDeleteError(null)} />
      )}
      {saveError !== null && (
        <Banner
          tone="error"
          title="Uložení se nepovedlo"
          lines={errorLines(saveError, "Uložení selhalo", ["definition"])}
          onClose={() => setSaveError(null)}
        >
          <PathErrorList errors={saveDefinitionErrors} />
        </Banner>
      )}

      {base?.is_system && (
        <Banner tone="info" title="Systémové pravidlo">
          Událost <code className="font-mono text-xs">{lockedEvent}</code>
          {lockedEventLabel ? ` (${lockedEventLabel})` : ""} a typ{" "}
          <code className="font-mono text-xs">{lockedType}</code>
          {lockedTypeName ? ` (${lockedTypeName})` : ""} jsou zamčené. Podmínky, kanály, zpoždění, název a stav upravit lze;
          pravidlo nelze smazat.
        </Banner>
      )}

      <SectionCard title="Pravidlo">
        <Field label="Název" error={form.name === "" && !isNew ? nameProblem : null}>
          <input className={inputClass} value={form.name} onChange={(e) => update({ name: e.target.value })} />
        </Field>
        <Field label="Popis">
          <textarea
            rows={2}
            className={inputClass}
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
          />
        </Field>
        <CheckboxRow
          checked={form.isActive}
          onChange={(v) => update({ isActive: v })}
          label="Aktivní"
          hint="Aktivní může být jen platné pravidlo s aktivním typem, které nemá aktivní dvojče (stejná událost, typ a podmínky)."
        />
      </SectionCard>

      <SectionCard
        title="Definice"
        description={
          <>
            JSON se sekcemi <code className="font-mono">when</code> (událost), <code className="font-mono">if</code>{" "}
            (podmínky, všechny musí platit) a <code className="font-mono">then</code> (typ, role, kanály, zpoždění v
            minutách).
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleFormat} disabled={!!jsonError}>
              Formátovat
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleValidate}
              isLoading={validateMutation.isPending}
              disabled={!isObject(parsed)}
            >
              Ověřit
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="space-y-2 min-w-0">
            <textarea
              aria-label="Definice pravidla (JSON)"
              rows={22}
              spellCheck={false}
              className={cn(monoTextareaClass, jsonError || lockProblem ? "border-red-300" : "border-gray-300")}
              value={form.definitionText}
              onKeyDown={(e) => handleTabKey(e, setDefinitionText)}
              onChange={(e) => setDefinitionText(e.target.value)}
            />
            {jsonError && <JsonErrorNotice text={form.definitionText} error={jsonError} label="Neplatný JSON" />}
            {!jsonError && !isObject(parsed) && <Banner tone="error">Definice musí být JSON objekt.</Banner>}
            {lockProblem && <Banner tone="error">{lockProblem}</Banner>}
            {validationError !== null && (
              <Banner tone="error" lines={errorLines(validationError, "Ověření selhalo")} onClose={() => setValidationError(null)} />
            )}
            {validation &&
              (validation.valid ? (
                <Banner tone="success" onClose={() => setValidation(null)}>
                  Definice je platná.
                </Banner>
              ) : (
                <Banner tone="error" title="Definice má chyby" onClose={() => setValidation(null)}>
                  <PathErrorList errors={validation.errors} />
                </Banner>
              ))}
          </div>
          <CatalogPanel
            events={events}
            recipientFields={meta?.recipientFields ?? []}
            operators={meta?.operators ?? []}
            types={types ?? []}
            currentEvent={currentEvent}
            currentType={parsedType ?? base?.definition?.then?.type ?? null}
            locked={Boolean(base?.is_system)}
            canEdit={isObject(parsed)}
            onUseEvent={applyEvent}
            onAddCondition={addCondition}
            onAddRecipientCondition={addRecipientCondition}
            onUseType={applyType}
          />
        </div>
      </SectionCard>

      {isNew || !base ? (
        <p className="text-sm text-gray-500">Test pravidla bude k dispozici po uložení.</p>
      ) : (
        <RuleTestPanel ruleId={base.id} event={savedEvent ?? catalogEvent} dirty={dirty} />
      )}

      {!isNew && (
        <SectionCard title="Historie změn">
          <AuditHistoryList entries={audit.data} isLoading={audit.isLoading} error={audit.error} />
        </SectionCard>
      )}
    </div>
  );
}
