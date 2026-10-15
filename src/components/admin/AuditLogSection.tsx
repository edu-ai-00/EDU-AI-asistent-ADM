"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "use-debounce";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Lock,
  ScrollText,
  ShieldAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingPage, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { useClassrooms } from "@/hooks/useClassrooms";
import { useSchools } from "@/hooks/useSchools";
import {
  AUDIT_LOG_FILTER_KEYS,
  EMPTY_AUDIT_LOG_FILTERS,
  downloadAuditLogExport,
  useAuditLogs,
} from "@/hooks/useAuditLogs";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_OUTCOME_LABELS,
  AUDIT_ROLE_LABELS,
  AUDIT_SOURCE_LABELS,
  AUDIT_TARGET_TYPE_LABELS,
  auditActionFilterLabel,
  auditActionLabel,
  auditOutcomeLabel,
  auditRoleLabel,
  auditSourceLabel,
  auditTargetTypeLabel,
  buildAuditActionOptions,
} from "@/lib/audit-log";
import type {
  AuditDiffEntry,
  AuditExportFormat,
  AuditLogEntry,
  AuditLogFilters,
} from "@/types/audit-log";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function pluralRecords(n: number): string {
  if (n === 1) return "záznam";
  if (n >= 2 && n <= 4) return "záznamy";
  return "záznamů";
}

function isFromTo(value: unknown): value is AuditDiffEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    ("from" in value || "to" in value)
  );
}

/** Strings (including the redacted `"[skryto]"`) render as-is; anything else as JSON. */
function DiffValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-gray-400">—</span>;
  }
  if (typeof value === "string") {
    return <span className="whitespace-pre-wrap break-words">{value}</span>;
  }
  return <code className="font-mono break-all">{JSON.stringify(value)}</code>;
}

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

function readFilters(searchParams: URLSearchParams): AuditLogFilters {
  const filters = { ...EMPTY_AUDIT_LOG_FILTERS };
  for (const key of AUDIT_LOG_FILTER_KEYS) filters[key] = searchParams.get(key) ?? "";
  return filters;
}

// ── Badges ───────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  teacher: "bg-blue-100 text-blue-700",
  student: "bg-orange-100 text-orange-700",
  guardian: "bg-teal-100 text-teal-700",
};

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return <span className="text-gray-300">—</span>;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
        ROLE_BADGE[role] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {auditRoleLabel(role)}
    </span>
  );
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  if (outcome === "denied") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap bg-red-100 text-red-700">
        <ShieldAlert className="w-3 h-3" />
        {auditOutcomeLabel(outcome)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-green-50 text-green-700">
      {auditOutcomeLabel(outcome)}
    </span>
  );
}

// ── Cells ────────────────────────────────────────────────────────────────────

type NameMap = Map<number, string>;

function ActorCell({ entry }: { entry: AuditLogEntry }) {
  if (entry.actor) {
    const primary = entry.actor.name || entry.actor.email || `#${entry.actor.id}`;
    return (
      <div className="max-w-[180px]">
        <div className="text-gray-900 truncate" title={primary}>
          {primary}
        </div>
        {entry.actor.name && entry.actor.email && (
          <div className="text-xs text-gray-500 truncate" title={entry.actor.email}>
            {entry.actor.email}
          </div>
        )}
      </div>
    );
  }
  if (entry.actor_id) {
    return (
      <span className="text-gray-500 whitespace-nowrap">
        <span className="font-mono">#{entry.actor_id}</span>{" "}
        <span className="text-xs italic">(smazaný účet)</span>
      </span>
    );
  }
  return <span className="text-xs italic text-gray-400 whitespace-nowrap">bez účtu</span>;
}

function targetName(entry: AuditLogEntry, schools: NameMap, classrooms: NameMap): string | null {
  if (entry.target_id === null) return null;
  if (entry.target_type === "classroom") return classrooms.get(entry.target_id) ?? null;
  if (entry.target_type === "school") return schools.get(entry.target_id) ?? null;
  return null;
}

function TargetCell({
  entry,
  schools,
  classrooms,
}: {
  entry: AuditLogEntry;
  schools: NameMap;
  classrooms: NameMap;
}) {
  if (!entry.target_type) return <span className="text-gray-300">—</span>;
  const name = targetName(entry, schools, classrooms);
  return (
    <div className="max-w-[140px]">
      <div className="whitespace-nowrap text-gray-700" title={entry.target_type}>
        {auditTargetTypeLabel(entry.target_type)}
        {entry.target_id !== null && (
          <span className="ml-1 font-mono text-xs text-gray-500">#{entry.target_id}</span>
        )}
      </div>
      {name && (
        <div className="text-xs text-gray-500 truncate" title={name}>
          {name}
        </div>
      )}
    </div>
  );
}

function ScopeCell({
  scope,
  schools,
  classrooms,
}: {
  scope: AuditLogEntry["scope"];
  schools: NameMap;
  classrooms: NameMap;
}) {
  const schoolId = scope?.school_id ?? null;
  const classroomId = scope?.classroom_id ?? null;
  if (schoolId === null && classroomId === null) {
    return <span className="text-gray-300">—</span>;
  }
  const line = (label: string, id: number, name?: string) => (
    <div className="text-xs text-gray-600 truncate" title={name}>
      {label} {name ? <span className="text-gray-900">{name}</span> : null}
      <span className="ml-1 font-mono text-gray-400">#{id}</span>
    </div>
  );
  return (
    <div className="max-w-[160px]">
      {schoolId !== null && line("Škola", schoolId, schools.get(schoolId))}
      {classroomId !== null && line("Třída", classroomId, classrooms.get(classroomId))}
    </div>
  );
}

// ── Detail ───────────────────────────────────────────────────────────────────

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 py-1">
      <span className="text-xs font-medium text-gray-500 w-28 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 break-all min-w-0">{children}</span>
    </div>
  );
}

function AuditLogDetail({
  entry,
  onFilter,
}: {
  entry: AuditLogEntry;
  onFilter: (updates: Partial<AuditLogFilters>) => void;
}) {
  const diffEntries = entry.diff ? Object.entries(entry.diff) : [];
  const hasMeta = entry.meta !== null && Object.keys(entry.meta).length > 0;
  const actorId = entry.actor?.id ?? entry.actor_id;

  return (
    <div className="space-y-4">
      <div className="grid gap-x-6 md:grid-cols-2">
        <div>
          <DetailRow label="Záznam">
            <span className="font-mono">#{entry.id}</span>
          </DetailRow>
          <DetailRow label="Čas">{formatDateTime(entry.created_at)}</DetailRow>
          <DetailRow label="Akce">
            {auditActionLabel(entry.action)}{" "}
            <span className="font-mono text-xs text-gray-500">{entry.action}</span>
          </DetailRow>
          <DetailRow label="Aktér">
            {entry.actor ? (
              <>
                {entry.actor.name || "—"}
                {entry.actor.email && (
                  <span className="ml-1.5 text-gray-500">({entry.actor.email})</span>
                )}
              </>
            ) : entry.actor_id ? (
              <span className="italic text-gray-500">smazaný účet</span>
            ) : (
              <span className="italic text-gray-500">bez účtu</span>
            )}
            {actorId ? (
              <span className="ml-1.5 font-mono text-xs text-gray-400">#{actorId}</span>
            ) : null}
          </DetailRow>
        </div>
        <div>
          <DetailRow label="Role">{auditRoleLabel(entry.actor_role)}</DetailRow>
          <DetailRow label="Zdroj">{auditSourceLabel(entry.source)}</DetailRow>
          <DetailRow label="IP adresa">
            {entry.ip ? <span className="font-mono">{entry.ip}</span> : <span className="text-gray-400">—</span>}
          </DetailRow>
          <DetailRow label="User agent">
            {entry.user_agent ? (
              <span className="text-xs text-gray-700">{entry.user_agent}</span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </DetailRow>
        </div>
      </div>

      {/* Diff */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Změny</p>
        {diffEntries.length === 0 ? (
          <p className="text-sm text-gray-400">Bez zaznamenaných změn</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium w-1/4">Pole</th>
                  <th className="px-3 py-1.5 text-left font-medium">Před</th>
                  <th className="px-3 py-1.5 text-left font-medium">Po</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {diffEntries.map(([field, change]) => (
                  <tr key={field} className="align-top">
                    <td className="px-3 py-1.5 font-mono text-gray-700">{field}</td>
                    {isFromTo(change) ? (
                      <>
                        <td className="px-3 py-1.5 text-red-800 bg-red-50/50">
                          <DiffValue value={change.from} />
                        </td>
                        <td className="px-3 py-1.5 text-green-800 bg-green-50/50">
                          <DiffValue value={change.to} />
                        </td>
                      </>
                    ) : (
                      <td className="px-3 py-1.5 text-gray-700" colSpan={2}>
                        <DiffValue value={change} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Meta */}
      {hasMeta && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Metadata</p>
          <pre className="text-xs bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto max-h-64">
            {JSON.stringify(entry.meta, null, 2)}
          </pre>
        </div>
      )}

      {/* Filter shortcuts */}
      {(actorId || (entry.target_type && entry.target_id !== null)) && (
        <div className="flex flex-wrap gap-2">
          {actorId ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onFilter({ actor_id: String(actorId) })}
            >
              Jen záznamy tohoto aktéra
            </Button>
          ) : null}
          {entry.target_type && entry.target_id !== null && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                onFilter({
                  target_type: entry.target_type ?? "",
                  target_id: String(entry.target_id),
                })
              }
            >
              Jen záznamy tohoto cíle
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Filters ──────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 min-w-0">
      {label}
      {children}
    </label>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (value: string) => void;
}) {
  // Keep a value from the URL selectable even if the map does not know it.
  const entries = Object.entries(options);
  if (value && !(value in options)) entries.push([value, value]);
  return (
    <Field label={label}>
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Vše</option>
        {entries.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** Numeric ID input: typing is local, the URL is updated once the user pauses. */
function IdFilter({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
}) {
  const [input, setInput] = useState(value);
  const [debounced] = useDebounce(input, 400);

  useEffect(() => {
    if (debounced !== value) onCommit(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // Follow the URL when it changes from outside (back/forward, "Zrušit filtry").
  useEffect(() => {
    setInput(value);
  }, [value]);

  return (
    <Field label={label}>
      <input
        type="text"
        inputMode="numeric"
        className={inputClass}
        placeholder="ID"
        value={input}
        onChange={(e) => setInput(e.target.value.replace(/\D/g, ""))}
      />
    </Field>
  );
}

function ActionFilter({
  value,
  actions,
  onChange,
}: {
  value: string;
  actions: string[];
  onChange: (value: string) => void;
}) {
  const groups = useMemo(() => {
    // An exact key from the URL stays selectable even if the log no longer has it.
    const keys = value && !value.endsWith(".*") ? [...actions, value] : actions;
    return buildAuditActionOptions(keys);
  }, [actions, value]);

  const orphanGroup =
    value.endsWith(".*") && !groups.some((g) => `${g.group}.*` === value) ? value : null;

  return (
    <Field label="Akce">
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Všechny akce</option>
        {orphanGroup && <option value={orphanGroup}>{auditActionFilterLabel(orphanGroup)}</option>}
        {groups.map((g) => (
          <optgroup key={g.group} label={g.label}>
            {g.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </Field>
  );
}

// ── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  lastPage,
  total,
  onPageChange,
}: {
  page: number;
  lastPage: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (lastPage <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
      <span className="text-sm text-gray-500">
        Celkem {total} {pluralRecords(total)}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Předchozí stránka"
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-gray-700 tabular-nums">
          {page} / {lastPage}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage}
          aria-label="Další stránka"
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

const COLUMN_COUNT = 8;

/**
 * Unified audit log (BR-BNNASY): who changed what in classes, schools, users,
 * courses, exports and guardian consents. Admin-only. Filters live in the URL
 * so a filtered view can be shared or reloaded; CSV/JSON export takes the same
 * filters.
 */
export function AuditLogSection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAdmin } = useAuth();

  const searchKey = searchParams.toString();
  const filters = useMemo(
    () => readFilters(new URLSearchParams(searchKey)),
    [searchKey]
  );
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const { data, isLoading, isFetching, error } = useAuditLogs(filters, page);
  const { data: classrooms } = useClassrooms();
  const { data: schools } = useSchools();

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [exporting, setExporting] = useState<AuditExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const classroomNames = useMemo(() => {
    const map: NameMap = new Map();
    for (const c of classrooms ?? []) map.set(c.id, c.name);
    return map;
  }, [classrooms]);
  const schoolNames = useMemo(() => {
    const map: NameMap = new Map();
    for (const s of schools ?? []) map.set(s.id, s.name);
    return map;
  }, [schools]);

  // Before the first response arrives, offer every key we have a label for.
  const actions = data?.meta.actions ?? Object.keys(AUDIT_ACTION_LABELS);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const setFilters = useCallback(
    (updates: Partial<AuditLogFilters>) => {
      setExportError(null);
      updateParams({ ...updates, page: null });
    },
    [updateParams]
  );

  const setFilter = (key: keyof AuditLogFilters) => (value: string) =>
    setFilters({ [key]: value });

  const setPage = (next: number) => {
    setExpandedId(null);
    updateParams({ page: next === 1 ? null : String(next) });
  };

  const hasActiveFilters = AUDIT_LOG_FILTER_KEYS.some((k) => filters[k] !== "");

  const clearFilters = () =>
    setFilters(
      Object.fromEntries(AUDIT_LOG_FILTER_KEYS.map((k) => [k, ""])) as Partial<AuditLogFilters>
    );

  const handleExport = async (format: AuditExportFormat) => {
    setExporting(format);
    setExportError(null);
    try {
      await downloadAuditLogExport(filters, format);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export selhal");
    } finally {
      setExporting(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
        <Lock className="w-10 h-10 text-gray-300" />
        <p className="text-gray-600">Audit log je dostupný jen administrátorům.</p>
      </div>
    );
  }

  const entries = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Od">
          <input
            type="date"
            className={inputClass}
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => setFilter("from")(e.target.value)}
          />
        </Field>
        <Field label="Do">
          <input
            type="date"
            className={inputClass}
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => setFilter("to")(e.target.value)}
          />
        </Field>
        <div className="col-span-2">
          <ActionFilter value={filters.action} actions={actions} onChange={setFilter("action")} />
        </div>

        <SelectFilter
          label="Role aktéra"
          value={filters.actor_role}
          options={AUDIT_ROLE_LABELS}
          onChange={setFilter("actor_role")}
        />
        <IdFilter label="ID aktéra" value={filters.actor_id} onCommit={setFilter("actor_id")} />
        <SelectFilter
          label="Zdroj"
          value={filters.source}
          options={AUDIT_SOURCE_LABELS}
          onChange={setFilter("source")}
        />
        <SelectFilter
          label="Výsledek"
          value={filters.outcome}
          options={AUDIT_OUTCOME_LABELS}
          onChange={setFilter("outcome")}
        />

        <SelectFilter
          label="Typ cíle"
          value={filters.target_type}
          options={AUDIT_TARGET_TYPE_LABELS}
          onChange={setFilter("target_type")}
        />
        <IdFilter label="ID cíle" value={filters.target_id} onCommit={setFilter("target_id")} />
        <IdFilter label="ID školy" value={filters.school_id} onCommit={setFilter("school_id")} />
        <IdFilter label="ID třídy" value={filters.classroom_id} onCommit={setFilter("classroom_id")} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500 tabular-nums">
          {meta ? `${meta.total} ${pluralRecords(meta.total)}` : ""}
        </span>
        {isFetching && <LoadingSpinner size="sm" />}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Zrušit filtry
          </button>
        )}
        <div className="flex-1" />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleExport("csv")}
          isLoading={exporting === "csv"}
          disabled={exporting !== null || meta?.total === 0}
        >
          {exporting !== "csv" && <Download className="w-4 h-4" />}
          Export CSV
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleExport("json")}
          isLoading={exporting === "json"}
          disabled={exporting !== null || meta?.total === 0}
        >
          {exporting !== "json" && <Download className="w-4 h-4" />}
          Export JSON
        </Button>
      </div>

      {exportError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="flex-1">{exportError}</span>
          <button
            onClick={() => setExportError(null)}
            aria-label="Zavřít"
            className="text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && data && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error instanceof Error ? error.message : "Nepodařilo se načíst audit log"}</span>
        </div>
      )}

      {/* Table */}
      {isLoading && !data ? (
        <LoadingPage message="Načítání audit logu..." />
      ) : error && !data ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-gray-600">Nepodařilo se načíst audit log</p>
          <p className="text-sm text-gray-400">
            {error instanceof Error ? error.message : "Neznámá chyba"}
          </p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <ScrollText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">
            {hasActiveFilters
              ? "Žádné záznamy neodpovídají filtrům"
              : "Audit log je zatím prázdný"}
          </p>
        </div>
      ) : (
        <div
          className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${
            isFetching ? "opacity-60" : ""
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3 whitespace-nowrap">Čas</th>
                  <th className="px-3 py-3">Aktér</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Akce</th>
                  <th className="px-3 py-3">Cíl</th>
                  <th className="px-3 py-3">Rozsah</th>
                  <th className="px-3 py-3">Zdroj</th>
                  <th className="px-3 py-3">Výsledek</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const expanded = expandedId === entry.id;
                  const denied = entry.outcome === "denied";
                  const toggle = () => setExpandedId(expanded ? null : entry.id);
                  return (
                    <Fragment key={entry.id}>
                      <tr
                        onClick={toggle}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggle();
                          }
                        }}
                        tabIndex={0}
                        aria-expanded={expanded}
                        className={`border-b border-gray-100 cursor-pointer transition-colors align-top ${
                          denied
                            ? "bg-red-50/60 hover:bg-red-50"
                            : expanded
                              ? "bg-blue-50/40"
                              : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600 tabular-nums">
                          <span className="inline-flex items-center gap-1">
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                                expanded ? "" : "-rotate-90"
                              }`}
                            />
                            {formatDateTime(entry.created_at)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <ActorCell entry={entry} />
                        </td>
                        <td className="px-3 py-2.5">
                          <RoleBadge role={entry.actor_role} />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className={denied ? "text-red-800 font-medium" : "text-gray-900"}>
                            {auditActionLabel(entry.action)}
                          </div>
                          <div className="font-mono text-[11px] text-gray-400">{entry.action}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <TargetCell entry={entry} schools={schoolNames} classrooms={classroomNames} />
                        </td>
                        <td className="px-3 py-2.5">
                          <ScopeCell scope={entry.scope} schools={schoolNames} classrooms={classroomNames} />
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">
                          {auditSourceLabel(entry.source)}
                        </td>
                        <td className="px-3 py-2.5">
                          <OutcomeBadge outcome={entry.outcome} />
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <td colSpan={COLUMN_COUNT} className="px-4 py-4">
                            <AuditLogDetail
                              entry={entry}
                              onFilter={(updates) => {
                                setExpandedId(null);
                                setFilters(updates);
                              }}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meta && (
            <Pagination
              page={meta.page}
              lastPage={meta.last_page}
              total={meta.total}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
