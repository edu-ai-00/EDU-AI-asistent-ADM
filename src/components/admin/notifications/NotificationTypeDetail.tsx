"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { AlertCircle, Bell, Newspaper, Send, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingPage, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { UserSearchPicker } from "@/components/admin/UserSearchPicker";
import { useAuth } from "@/hooks/useAuth";
import {
  useNotificationMeta,
  useNotificationType,
  useNotificationTypeAudit,
  useNotificationTypePreview,
  useSendNotificationTypeTest,
  useUpdateNotificationType,
} from "@/hooks/useNotifications";
import {
  DEFAULT_TEMPLATE_LIMITS,
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_ROLE_LABELS,
  TEMPLATE_KEYS,
  collectTemplateErrors,
  eventLabel,
  insertAtCursor,
  missingRequiredVariables,
  reasonLabel,
  resolveTemplateLimits,
  targetActionLabel,
  templateLabel,
  unknownTemplateVariables,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/types/api";
import type {
  NotificationChannel,
  NotificationDecision,
  NotificationTestResult,
  NotificationType,
  NotificationTypeUpdate,
  NotificationVariable,
  PreviewKey,
  TemplateError,
  TemplateKey,
} from "@/types/notifications";
import {
  ActivePill,
  AdminOnlyNotice,
  AuditHistoryList,
  BackLink,
  Banner,
  CategoryPill,
  CheckboxRow,
  Field,
  Pill,
  SectionCard,
  errorLines,
  errorMessage,
  errorPayload,
  inputClass,
} from "./shared";

// ── Form model ───────────────────────────────────────────────────────────────

interface TypeForm {
  name: string;
  description: string;
  category: string;
  target_role: string;
  is_active: boolean;
  is_mandatory: boolean;
  manual_allowed: boolean;
  channels: NotificationChannel[];
  respect_quiet_hours: boolean;
  frequency_limit: string;
  frequency_period_hours: string;
  dedup_window_hours: string;
  push_title: string;
  push_body: string;
  feed_title: string;
  feed_body: string;
  deep_link: string;
  variables: NotificationVariable[];
}

const CHANNELS: NotificationChannel[] = ["push", "feed"];

function numberText(n: number | null | undefined): string {
  return n === null || n === undefined ? "" : String(n);
}

function toForm(t: NotificationType): TypeForm {
  return {
    name: t.name ?? "",
    description: t.description ?? "",
    category: t.category ?? "",
    target_role: t.target_role ?? "",
    is_active: Boolean(t.is_active),
    is_mandatory: Boolean(t.is_mandatory),
    manual_allowed: Boolean(t.manual_allowed),
    channels: CHANNELS.filter((c) => (t.channels ?? []).includes(c)),
    respect_quiet_hours: Boolean(t.respect_quiet_hours),
    frequency_limit: numberText(t.frequency_limit),
    frequency_period_hours: numberText(t.frequency_period_hours),
    dedup_window_hours: numberText(t.dedup_window_hours),
    push_title: t.push_title ?? "",
    push_body: t.push_body ?? "",
    feed_title: t.feed_title ?? "",
    feed_body: t.feed_body ?? "",
    deep_link: t.deep_link ?? "",
    variables: (t.variables ?? []).map((v) => ({
      key: v.key,
      label: v.label ?? "",
      sample: v.sample === null || v.sample === undefined ? "" : String(v.sample),
      fallback: v.fallback ?? "",
      required: Boolean(v.required),
    })),
  };
}

const sameForm = (a: TypeForm, b: TypeForm) => JSON.stringify(a) === JSON.stringify(b);

const intOrNull = (text: string): number | null => (text.trim() === "" ? null : Number(text));

function toPayload(f: TypeForm): NotificationTypeUpdate {
  return {
    name: f.name.trim(),
    description: f.description.trim() || null,
    category: f.category,
    target_role: f.target_role,
    is_active: f.is_active,
    is_mandatory: f.is_mandatory,
    manual_allowed: f.manual_allowed,
    channels: f.channels,
    respect_quiet_hours: f.respect_quiet_hours,
    frequency_limit: intOrNull(f.frequency_limit),
    frequency_period_hours: intOrNull(f.frequency_period_hours),
    dedup_window_hours: intOrNull(f.dedup_window_hours) ?? 0,
    push_title: f.push_title,
    push_body: f.push_body,
    feed_title: f.feed_title,
    feed_body: f.feed_body,
    deep_link: f.deep_link.trim() || null,
    variables: f.variables.map((v) => ({
      key: v.key,
      label: v.label,
      sample: v.sample,
      fallback: v.fallback,
      required: v.required,
    })),
  };
}

function isWholeNumber(text: string, min: number): boolean {
  if (text.trim() === "") return true;
  const n = Number(text);
  return Number.isInteger(n) && n >= min;
}

/** Problems the API would reject anyway, caught before the round-trip. */
function formProblems(f: TypeForm): string[] {
  const out: string[] = [];
  if (!f.name.trim()) out.push("Název je povinný.");
  if (f.channels.length === 0) out.push("Vyberte alespoň jeden kanál.");
  if (!isWholeNumber(f.frequency_limit, 1)) out.push("Frekvenční limit musí být celé číslo od 1.");
  if (!isWholeNumber(f.frequency_period_hours, 1)) out.push("Období frekvence musí být celý počet hodin od 1.");
  if ((f.frequency_limit.trim() === "") !== (f.frequency_period_hours.trim() === "")) {
    out.push("Frekvenční limit a jeho období vyplňte obě, nebo ani jedno.");
  }
  if (f.dedup_window_hours.trim() === "" || !isWholeNumber(f.dedup_window_hours, 0)) {
    out.push("Okno deduplikace musí být celý počet hodin (0 a víc).");
  }
  return out;
}

type EditableField = PreviewKey;

const FIELD_ORDER: EditableField[] = [...TEMPLATE_KEYS, "deep_link"];

// ── Template field ───────────────────────────────────────────────────────────

function TemplateField({
  field,
  value,
  multiline,
  limit,
  length,
  errors,
  unknown,
  active,
  disabled,
  onChange,
  onFocus,
  inputRef,
  listId,
}: {
  field: EditableField;
  value: string;
  multiline?: boolean;
  limit?: number;
  length?: number;
  errors: string[];
  unknown: string[];
  active: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  inputRef: (el: HTMLInputElement | HTMLTextAreaElement | null) => void;
  listId?: string;
}) {
  const over = limit !== undefined && length !== undefined && length > limit;
  const className = cn(
    inputClass,
    active && "ring-1 ring-blue-200",
    (over || errors.length > 0 || unknown.length > 0) && "border-red-300"
  );
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-gray-600">{templateLabel(field)}</span>
        {limit !== undefined && (
          <span
            className={cn("text-xs tabular-nums", over ? "text-red-600 font-medium" : "text-gray-400")}
            title="Délka po dosazení vzorových hodnot / limit"
          >
            {length ?? "–"} / {limit}
          </span>
        )}
      </div>
      {multiline ? (
        <textarea
          ref={inputRef}
          rows={3}
          className={className}
          value={value}
          disabled={disabled}
          onFocus={onFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          className={cn(className, field === "deep_link" && "font-mono")}
          value={value}
          list={listId}
          disabled={disabled}
          onFocus={onFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {unknown.length > 0 && (
        <p className="text-xs text-red-600">
          Neznámá proměnná: {unknown.map((u) => `{{${u}}}`).join(", ")} — typ ji nedeklaruje.
        </p>
      )}
      {over && <p className="text-xs text-red-600">Text je po dosazení vzorových hodnot delší než {limit} znaků.</p>}
      {errors.map((message, i) => (
        <p key={i} className="text-xs text-red-600">
          {message}
        </p>
      ))}
    </div>
  );
}

// ── Preview ──────────────────────────────────────────────────────────────────

function PreviewCard({
  icon: Icon,
  label,
  title,
  body,
  footer,
  off,
}: {
  icon: typeof Bell;
  label: string;
  title: string | null | undefined;
  body: string | null | undefined;
  footer?: React.ReactNode;
  off?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border border-gray-200 bg-gray-50 p-3", off && "opacity-50")}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
        {off && <span className="normal-case tracking-normal font-normal">(kanál vypnutý)</span>}
      </div>
      <div className="rounded-md bg-white border border-gray-100 px-3 py-2">
        <div className="text-sm font-semibold text-gray-900 break-words">{title || <span className="text-gray-300">—</span>}</div>
        <div className="text-sm text-gray-700 whitespace-pre-wrap break-words mt-0.5">
          {body || <span className="text-gray-300">—</span>}
        </div>
        {footer}
      </div>
    </div>
  );
}

function DecisionList({ decisions }: { decisions: NotificationDecision[] }) {
  if (decisions.length === 0) return null;
  return (
    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white text-sm">
      {decisions.map((d, i) => (
        <li key={i} className="flex flex-wrap items-baseline gap-x-2 px-3 py-1.5">
          <span className="text-gray-900">{eventLabel(d.event ?? d.decision ?? null)}</span>
          {d.reason && <span className="text-gray-600">· {reasonLabel(d.reason)}</span>}
          {d.reason && <span className="font-mono text-[11px] text-gray-400">{d.reason}</span>}
          {d.user_id ? <span className="text-xs text-gray-400">uživatel #{d.user_id}</span> : null}
        </li>
      ))}
    </ul>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

/**
 * Type detail (NOTIF-5/9): base settings, the four templates with variable
 * chips and a live server preview, delivery rules, a test send through the
 * real pipeline and the audit trail. Keys and variable keys are fixed — the
 * seeder owns them.
 */
export function NotificationTypeDetail({ typeId }: { typeId: number }) {
  const { isAdmin } = useAuth();
  const { data: type, isLoading, error } = useNotificationType(typeId);
  const { data: meta } = useNotificationMeta();
  const audit = useNotificationTypeAudit(typeId);
  const updateMutation = useUpdateNotificationType(typeId);
  const testMutation = useSendNotificationTypeTest(typeId);

  const [base, setBase] = useState<NotificationType | null>(null);
  const [form, setForm] = useState<TypeForm | null>(null);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  const [activeField, setActiveField] = useState<EditableField>("push_title");
  const fieldRefs = useRef<Partial<Record<EditableField, HTMLInputElement | HTMLTextAreaElement | null>>>({});

  const [testUser, setTestUser] = useState<AdminUser | null>(null);
  const [testSample, setTestSample] = useState<Record<string, string>>({});
  const [testChannels, setTestChannels] = useState<NotificationChannel[]>([]);
  const [testResult, setTestResult] = useState<NotificationTestResult | null>(null);
  const [testError, setTestError] = useState<unknown>(null);

  const baseForm = useMemo(() => (base ? toForm(base) : null), [base]);
  const dirty = form !== null && baseForm !== null && !sameForm(form, baseForm);

  // Adopt the server copy on first load and whenever it changes underneath a
  // clean form; never overwrite unsaved edits with a background refetch.
  useEffect(() => {
    if (!type) return;
    if (!base || !dirty) {
      setBase(type);
      setForm(toForm(type));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // Test defaults follow the stored type, not the unsaved form — the test
  // send renders the saved templates.
  useEffect(() => {
    if (!base) return;
    setTestSample(
      Object.fromEntries(
        (base.variables ?? []).map((v) => [v.key, v.sample === null || v.sample === undefined ? "" : String(v.sample)])
      )
    );
    setTestChannels(CHANNELS.filter((c) => (base.channels ?? []).includes(c)));
  }, [base?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live preview ──
  const previewKey = useMemo(() => {
    if (!form) return null;
    return JSON.stringify({
      templates: {
        push_title: form.push_title,
        push_body: form.push_body,
        feed_title: form.feed_title,
        feed_body: form.feed_body,
        deep_link: form.deep_link || null,
      },
      sample: Object.fromEntries(form.variables.map((v) => [v.key, v.sample])),
    });
  }, [form]);
  const [debouncedPreviewKey] = useDebounce(previewKey, 500);
  const preview = useNotificationTypePreview(
    typeId,
    debouncedPreviewKey ? JSON.parse(debouncedPreviewKey) : null
  );
  const previewPending = previewKey !== debouncedPreviewKey || preview.isFetching;

  const limits = useMemo(() => {
    if (preview.data?.limits) return resolveTemplateLimits(preview.data.limits);
    return meta?.limits ?? DEFAULT_TEMPLATE_LIMITS;
  }, [preview.data?.limits, meta?.limits]);

  const saveTemplateErrors: TemplateError[] = useMemo(
    () => collectTemplateErrors(errorPayload(saveError)),
    [saveError]
  );
  // The preview reports template problems in `errors`; should it answer 422
  // instead, the same list arrives as `errors.templates`.
  const previewTemplateErrors: TemplateError[] = useMemo(
    () => [...(preview.data?.errors ?? []), ...collectTemplateErrors(errorPayload(preview.error))],
    [preview.data?.errors, preview.error]
  );

  if (!isAdmin) return <AdminOnlyNotice />;
  if (isLoading || (type && !form)) return <LoadingPage message="Načítám typ notifikace…" />;
  if (error || !type || !form || !base) {
    return (
      <div>
        <BackLink href="/admin/notifications">Typy notifikací</BackLink>
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <p className="text-gray-600">Typ notifikace se nepodařilo načíst</p>
          <p className="text-sm text-gray-400">{errorMessage(error, "Typ nenalezen")}</p>
        </div>
      </div>
    );
  }

  const update = (patch: Partial<TypeForm>) => {
    setSaved(false);
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  };
  const updateVariable = (key: string, patch: Partial<NotificationVariable>) =>
    update({ variables: form.variables.map((v) => (v.key === key ? { ...v, ...patch } : v)) });
  const toggleChannel = (channel: NotificationChannel, on: boolean) =>
    update({ channels: CHANNELS.filter((c) => (c === channel ? on : form.channels.includes(c))) });

  const insertVariable = (key: string) => {
    const field = activeField;
    const el = fieldRefs.current[field];
    const { text, cursor } = insertAtCursor(form[field], el?.selectionStart, el?.selectionEnd, `{{${key}}}`);
    update({ [field]: text } as Partial<TypeForm>);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(cursor, cursor);
    });
  };

  const problems = formProblems(form);
  const variableKeys = form.variables.map((v) => v.key);
  const templateTexts = TEMPLATE_KEYS.map((k) => form[k]);
  const missingRequired = missingRequiredVariables(templateTexts, form.variables);

  const fieldErrors = (field: EditableField): string[] =>
    Array.from(
      new Set(
        [...previewTemplateErrors, ...saveTemplateErrors].filter((e) => e.template === field).map((e) => e.message)
      )
    );
  const isFieldError = (e: TemplateError) => FIELD_ORDER.includes(e.template as EditableField);
  const generalTemplateErrors = saveTemplateErrors.filter((e) => !isFieldError(e)).map((e) => e.message);
  const generalPreviewErrors = previewTemplateErrors.filter((e) => !isFieldError(e)).map((e) => e.message);

  const handleSave = async () => {
    setSaveError(null);
    setSaved(false);
    try {
      const updated = await updateMutation.mutateAsync(toPayload(form));
      setBase(updated);
      setForm(toForm(updated));
      setSaved(true);
    } catch (err) {
      setSaveError(err);
    }
  };

  const handleReset = () => {
    setForm(toForm(base));
    setSaveError(null);
    setSaved(false);
  };

  const handleTest = async () => {
    if (!testUser) return;
    setTestError(null);
    setTestResult(null);
    try {
      const sample = Object.fromEntries(Object.entries(testSample).filter(([, v]) => v.trim() !== ""));
      const result = await testMutation.mutateAsync({
        user_id: testUser.id,
        sample,
        channels: testChannels,
      });
      setTestResult({ notification_id: result?.notification_id ?? null, decisions: result?.decisions ?? [] });
    } catch (err) {
      setTestError(err);
    }
  };

  const categoryOptions = meta?.categories.length
    ? meta.categories
    : Object.entries(NOTIFICATION_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
  const roleOptions = meta?.roles.length
    ? meta.roles
    : Object.entries(NOTIFICATION_ROLE_LABELS).map(([value, label]) => ({ value, label }));
  const withCurrent = (options: { value: string; label: string }[], current: string) =>
    current && !options.some((o) => o.value === current) ? [...options, { value: current, label: current }] : options;

  const rendered = preview.data?.rendered;
  const deepLinkListId = `deep-links-${type.id}`;

  const saveButton = (
    <Button
      onClick={handleSave}
      isLoading={updateMutation.isPending}
      disabled={!dirty || problems.length > 0}
      title={problems[0]}
    >
      Uložit změny
    </Button>
  );

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/admin/notifications">Typy notifikací</BackLink>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{base.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <code className="font-mono text-sm text-gray-500">{base.key}</code>
              <CategoryPill category={base.category} />
              <ActivePill active={base.is_active} />
              {base.is_mandatory && (
                <Pill className="bg-amber-50 text-amber-800">
                  <ShieldAlert className="w-3 h-3" />
                  Povinná
                </Pill>
              )}
              {base.is_system && <Pill className="bg-purple-50 text-purple-700">Systémový</Pill>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Zahodit změny
              </Button>
            )}
            {saveButton}
          </div>
        </div>
      </div>

      {saved && !dirty && <Banner tone="success" onClose={() => setSaved(false)}>Změny jsou uložené.</Banner>}
      {saveError !== null && (
        <Banner
          tone="error"
          title="Uložení se nepovedlo"
          lines={[...errorLines(saveError, "Uložení selhalo", ["templates"]), ...generalTemplateErrors]}
          onClose={() => setSaveError(null)}
        />
      )}

      {/* ── Základní nastavení ── */}
      <SectionCard title="Základní nastavení">
        <Field label="Název">
          <input className={inputClass} value={form.name} onChange={(e) => update({ name: e.target.value })} />
        </Field>
        <Field label="Popis" hint="Jen pro administraci — příjemci ho neuvidí.">
          <textarea
            rows={2}
            className={inputClass}
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Kategorie">
            <select
              className={inputClass}
              value={form.category}
              onChange={(e) => update({ category: e.target.value })}
            >
              {withCurrent(categoryOptions, form.category).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cílová role">
            <select
              className={inputClass}
              value={form.target_role}
              onChange={(e) => update({ target_role: e.target.value })}
            >
              {withCurrent(roleOptions, form.target_role).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="space-y-2">
          <CheckboxRow
            checked={form.is_active}
            onChange={(v) => update({ is_active: v })}
            label="Aktivní"
            hint="Vypnutý typ se neposílá — požadavky na něj služba odmítne (type_inactive)."
          />
          <CheckboxRow
            checked={form.is_mandatory}
            onChange={(v) => update({ is_mandatory: v })}
            label="Povinná notifikace"
            hint="Obchází tiché hodiny, vypnutý push i frekvenční limit. Deduplikaci ne."
          />
          <CheckboxRow
            checked={form.manual_allowed}
            onChange={(v) => update({ manual_allowed: v })}
            label="Povolit v ručních rozesílkách"
            hint="Typ půjde vybrat při zakládání rozesílky."
          />
        </div>
        {base.target_action && (
          <p className="text-xs text-gray-500">
            Cílová akce: <span className="text-gray-800">{targetActionLabel(base.target_action)}</span>{" "}
            <code className="font-mono text-gray-400">{base.target_action}</code>
          </p>
        )}
      </SectionCard>

      {/* ── Obsah ── */}
      <SectionCard
        title="Obsah"
        description="Šablony s proměnnými {{proměnná}}. Délky se počítají po dosazení vzorových hodnot; push se při odeslání zkrátí na limit se „…“."
        actions={previewPending ? <LoadingSpinner size="sm" /> : undefined}
      >
        {form.variables.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="text-xs text-gray-500 mb-1.5">
              Vložit proměnnou do pole <span className="font-medium text-gray-700">{templateLabel(activeField)}</span>:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.variables.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  title={v.label || v.key}
                  // Keep the caret in the template field.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertVariable(v.key)}
                  className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 font-mono text-xs text-blue-700 hover:bg-blue-50"
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {FIELD_ORDER.map((field) => (
            <TemplateField
              key={field}
              field={field}
              value={form[field]}
              multiline={field === "push_body" || field === "feed_body"}
              limit={field === "deep_link" ? undefined : limits[field as TemplateKey]}
              length={field === "deep_link" ? undefined : preview.data?.lengths?.[field as TemplateKey]}
              errors={fieldErrors(field)}
              unknown={unknownTemplateVariables([form[field]], variableKeys)}
              active={activeField === field}
              onChange={(value) => update({ [field]: value } as Partial<TypeForm>)}
              onFocus={() => setActiveField(field)}
              inputRef={(el) => {
                fieldRefs.current[field] = el;
              }}
              listId={field === "deep_link" ? deepLinkListId : undefined}
            />
          ))}
          <datalist id={deepLinkListId}>
            {(meta?.deepLinks ?? []).map((d) => (
              <option key={d.path} value={d.path}>
                {d.label}
              </option>
            ))}
          </datalist>
        </div>

        {missingRequired.length > 0 && (
          <Banner tone="warning">
            Povinná proměnná {missingRequired.map((k) => `{{${k}}}`).join(", ")} se nepoužívá v žádné ze čtyř šablon.
          </Banner>
        )}

        {/* Variables */}
        {form.variables.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">Proměnné</p>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500">
                  <tr>
                    <th className="px-2 py-2 font-medium">Klíč</th>
                    <th className="px-2 py-2 font-medium">Popis</th>
                    <th className="px-2 py-2 font-medium">Vzorová hodnota</th>
                    <th className="px-2 py-2 font-medium">Náhradní hodnota</th>
                    <th className="px-2 py-2 font-medium text-center">Povinná</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {form.variables.map((v) => (
                    <tr key={v.key} className="align-top">
                      <td className="px-2 py-1.5 font-mono text-xs text-gray-700 whitespace-nowrap pt-3">{v.key}</td>
                      <td className="px-2 py-1.5 min-w-[140px]">
                        <input
                          className={inputClass}
                          value={v.label}
                          onChange={(e) => updateVariable(v.key, { label: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5 min-w-[140px]">
                        <input
                          className={inputClass}
                          value={String(v.sample ?? "")}
                          onChange={(e) => updateVariable(v.key, { sample: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5 min-w-[140px]">
                        <input
                          className={cn(inputClass, !String(v.fallback ?? "").trim() && "border-amber-300")}
                          value={v.fallback ?? ""}
                          placeholder="(prázdné)"
                          onChange={(e) => updateVariable(v.key, { fallback: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center pt-3">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={v.required}
                          onChange={(e) => updateVariable(v.key, { required: e.target.checked })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Náhradní hodnota se použije, když proměnná při odeslání chybí nebo je prázdná.
            </p>
          </div>
        )}

        {/* Preview */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1.5">Náhled se vzorovými hodnotami</p>
          {preview.error ? (
            <Banner
              tone="error"
              className="mb-2"
              lines={[...errorLines(preview.error, "Náhled se nepodařilo vytvořit", ["templates"]), ...generalPreviewErrors]}
            />
          ) : (
            generalPreviewErrors.length > 0 && <Banner tone="error" className="mb-2" lines={generalPreviewErrors} />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PreviewCard
              icon={Bell}
              label="Push"
              title={rendered?.push_title}
              body={rendered?.push_body}
              off={!form.channels.includes("push")}
            />
            <PreviewCard
              icon={Newspaper}
              label="Novinky"
              title={rendered?.feed_title}
              body={rendered?.feed_body}
              off={!form.channels.includes("feed")}
              footer={
                rendered?.deep_link ? (
                  <div className="mt-1.5 font-mono text-[11px] text-blue-600 break-all">{rendered.deep_link}</div>
                ) : null
              }
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Doručení ── */}
      <SectionCard title="Doručení">
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1.5">Kanály</p>
          <div className="flex flex-wrap gap-4">
            {CHANNELS.map((c) => (
              <CheckboxRow
                key={c}
                checked={form.channels.includes(c)}
                onChange={(on) => toggleChannel(c, on)}
                label={NOTIFICATION_CHANNEL_LABELS[c]}
              />
            ))}
          </div>
          {form.channels.length === 0 && <p className="mt-1 text-xs text-red-600">Vyberte alespoň jeden kanál.</p>}
        </div>
        <CheckboxRow
          checked={form.is_mandatory ? false : form.respect_quiet_hours}
          disabled={form.is_mandatory}
          onChange={(v) => update({ respect_quiet_hours: v })}
          label="Respektovat tiché hodiny"
          hint={
            form.is_mandatory
              ? "Povinné notifikace tiché hodiny ignorují."
              : "Push v tichých hodinách příjemce se odloží na jejich konec; Novinky dostane hned."
          }
        />
        <Field
          label="Frekvenční limit"
          hint="Nejvýše tolik notifikací tohoto typu na uživatele za dané období. Prázdné = bez limitu."
        >
          <div className="flex flex-wrap items-center gap-2 text-sm font-normal text-gray-700">
            <span>Nejvýše</span>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              className={cn(inputClass, "w-24")}
              value={form.frequency_limit}
              onChange={(e) => update({ frequency_limit: e.target.value })}
            />
            <span>za</span>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              className={cn(inputClass, "w-24")}
              value={form.frequency_period_hours}
              onChange={(e) => update({ frequency_period_hours: e.target.value })}
            />
            <span>hodin</span>
          </div>
        </Field>
        <Field
          label="Okno deduplikace"
          hint="Stejná notifikace (stejný klíč) se stejnému uživateli v tomto okně podruhé nepošle."
        >
          <div className="flex items-center gap-2 text-sm font-normal text-gray-700">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className={cn(inputClass, "w-24")}
              value={form.dedup_window_hours}
              onChange={(e) => update({ dedup_window_hours: e.target.value })}
            />
            <span>hodin</span>
          </div>
        </Field>

        {problems.length > 0 && dirty && <Banner tone="warning" lines={problems} />}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
          {dirty ? (
            <span className="text-xs text-amber-700 mr-auto">Neuložené změny</span>
          ) : (
            <span className="text-xs text-gray-400 mr-auto">Vše uloženo</span>
          )}
          {saveButton}
        </div>
      </SectionCard>

      {/* ── Testování ── */}
      <SectionCard
        title="Testování"
        description="Pošle notifikaci vybranému uživateli přes stejnou službu jako ostrý provoz (zdroj „test“). Test přeskočí deduplikaci, limity a tiché hodiny."
      >
        {dirty && (
          <Banner tone="warning">Test použije uložené šablony a nastavení — neuložené změny se v něm neprojeví.</Banner>
        )}
        <UserSearchPicker label="Příjemce testu" value={testUser} onChange={setTestUser} />
        {(base.variables ?? []).length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">Hodnoty proměnných</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(base.variables ?? []).map((v) => (
                <Field key={v.key} label={v.label || v.key} hint={<code className="font-mono">{`{{${v.key}}}`}</code>}>
                  <input
                    className={inputClass}
                    value={testSample[v.key] ?? ""}
                    placeholder={v.fallback ?? ""}
                    onChange={(e) => setTestSample((prev) => ({ ...prev, [v.key]: e.target.value }))}
                  />
                </Field>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1.5">Kanály testu</p>
          <div className="flex flex-wrap gap-4">
            {CHANNELS.filter((c) => (base.channels ?? []).includes(c)).map((c) => (
              <CheckboxRow
                key={c}
                checked={testChannels.includes(c)}
                onChange={(on) =>
                  setTestChannels((prev) => CHANNELS.filter((x) => (x === c ? on : prev.includes(x))))
                }
                label={NOTIFICATION_CHANNEL_LABELS[c]}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleTest}
            isLoading={testMutation.isPending}
            disabled={!testUser || testChannels.length === 0}
          >
            {!testMutation.isPending && <Send className="w-4 h-4" />}
            Odeslat test
          </Button>
        </div>
        {testError !== null && (
          <Banner tone="error" lines={errorLines(testError, "Test se nepodařilo odeslat")} onClose={() => setTestError(null)} />
        )}
        {testResult && (
          <div className="space-y-2">
            {testResult.notification_id ? (
              <Banner tone="success">
                Test odeslán. ID notifikace:{" "}
                <code className="font-mono text-xs">{testResult.notification_id}</code>
              </Banner>
            ) : (
              <Banner tone="warning">Notifikace nevznikla — důvod je v rozhodnutích níže.</Banner>
            )}
            <DecisionList decisions={testResult.decisions} />
          </div>
        )}
      </SectionCard>

      {/* ── Audit ── */}
      <SectionCard title="Historie změn">
        <AuditHistoryList entries={audit.data} isLoading={audit.isLoading} error={audit.error} />
      </SectionCard>
    </div>
  );
}
