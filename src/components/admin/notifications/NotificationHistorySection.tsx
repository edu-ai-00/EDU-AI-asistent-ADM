"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "use-debounce";
import { AlertCircle, ChevronDown, ChevronLeft, ChevronRight, Download, Inbox, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingPage, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  downloadNotificationHistoryExport,
  useNotificationHistory,
  useNotificationHistoryEntry,
  useNotificationQueueHealth,
  useNotificationTypes,
} from "@/hooks/useNotifications";
import {
  EMPTY_HISTORY_FILTERS,
  HISTORY_FILTER_KEYS,
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_RESULT_LABELS,
  NOTIFICATION_SOURCE_LABELS,
  channelsLabel,
  eventLabel,
  formatDuration,
  percent,
  pluralCs,
  pushStatusLabel,
  readFilters,
  reasonLabel,
  sourceLabel,
  statusLabel,
  userRoleLabel,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import type {
  NotificationEventRow,
  NotificationHistoryFilters,
  NotificationHistoryRow,
  NotificationHistorySummary,
  NotificationHistoryUser,
} from "@/types/notifications";
import { Banner, Field, Pill, errorMessage, inputClass } from "./shared";

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
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

function isEventRow(row: NotificationHistoryRow | NotificationEventRow): row is NotificationEventRow {
  return typeof (row as NotificationEventRow).event === "string" && !("status" in row);
}

const STATUS_PILL: Record<string, string> = {
  created: "bg-gray-100 text-gray-700",
  queued: "bg-blue-50 text-blue-700",
  sent: "bg-blue-100 text-blue-800",
  delivered: "bg-green-50 text-green-700",
  viewed: "bg-green-100 text-green-800",
  clicked: "bg-emerald-100 text-emerald-800",
  app_opened: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-700",
};

const DECISION_PILL: Record<string, string> = {
  "decision.deliver": "bg-green-50 text-green-700",
  "decision.defer": "bg-amber-50 text-amber-800",
  "decision.suppress": "bg-gray-100 text-gray-700",
  "decision.reject": "bg-red-100 text-red-700",
};

const TIMESTAMPS: { key: keyof NotificationHistoryRow; label: string }[] = [
  { key: "created_at", label: "Vytvořeno" },
  { key: "queued_at", label: "Ve frontě" },
  { key: "sent_at", label: "Odesláno" },
  { key: "delivered_at", label: "Doručeno" },
  { key: "viewed_at", label: "Zobrazeno" },
  { key: "clicked_at", label: "Kliknuto" },
  { key: "app_opened_at", label: "Otevřena aplikace" },
  { key: "failed_at", label: "Selhalo" },
  { key: "target_action_at", label: "Cílová akce" },
];

// ── Filters ──────────────────────────────────────────────────────────────────

function SelectFilter({
  label,
  value,
  options,
  onChange,
  allLabel = "Vše",
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (value: string) => void;
  allLabel?: string;
}) {
  const entries = Object.entries(options);
  if (value && !(value in options)) entries.push([value, value]);
  return (
    <Field label={label}>
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
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
function IdFilter({ label, value, onCommit }: { label: string; value: string; onCommit: (value: string) => void }) {
  const [input, setInput] = useState(value);
  const [debounced] = useDebounce(input, 400);

  useEffect(() => {
    if (debounced !== value) onCommit(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

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

// ── Strips ───────────────────────────────────────────────────────────────────

function QueueHealthStrip() {
  const { data, error, isFetching } = useNotificationQueueHealth();
  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
        Stav fronty se nepodařilo načíst: {errorMessage(error, "neznámá chyba")}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-400">
        Načítám stav fronty…
      </div>
    );
  }
  const oldest = data.oldest_pending_seconds ?? 0;
  const tone =
    data.failed > 0
      ? "border-red-200 bg-red-50 text-red-900"
      : data.pending > 1000 || oldest > 600
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-green-200 bg-green-50 text-green-900";
  const item = (label: string, value: React.ReactNode, title?: string) => (
    <span className="whitespace-nowrap" title={title}>
      {label} <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-2 text-xs", tone)}>
      <span className="font-medium">Fronta</span>
      {item("Čeká úloh:", data.pending)}
      {item("z toho notifikací:", data.pending_notifications)}
      {item("nejstarší:", formatDuration(data.oldest_pending_seconds), "Jak dlouho čeká nejstarší úloha ve frontě")}
      {item("odložené push:", data.deferred_push, "Push odložený kvůli tichým hodinám nebo nedostupné frontě")}
      {item("selhané úlohy:", data.failed)}
      {isFetching && <LoadingSpinner size="sm" className="ml-auto" />}
    </div>
  );
}

function SummaryCounters({ summary }: { summary: NotificationHistorySummary }) {
  const cells: { label: string; value: number; tone?: string }[] = [
    { label: "Celkem", value: summary.total },
    { label: "Doručeno", value: summary.delivered, tone: "text-green-700" },
    { label: "Zobrazeno", value: summary.viewed, tone: "text-green-700" },
    { label: "Kliknuto", value: summary.clicked, tone: "text-emerald-700" },
    { label: "Otevřena aplikace", value: summary.app_opened, tone: "text-emerald-700" },
    { label: "Selhalo", value: summary.failed, tone: summary.failed > 0 ? "text-red-700" : undefined },
  ];
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {cells.map((c, i) => (
        <div key={c.label} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
          <div className="text-[11px] text-gray-500 truncate">{c.label}</div>
          <div className={cn("text-lg font-semibold tabular-nums text-gray-900", c.tone)}>{c.value}</div>
          {i > 0 && (
            <div className="text-[11px] text-gray-400 tabular-nums">{percent(c.value, summary.total)} %</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Cells ────────────────────────────────────────────────────────────────────

function UserCell({ user, userId }: { user: NotificationHistoryUser | null | undefined; userId?: number | null }) {
  if (!user) {
    return userId ? (
      <span className="font-mono text-xs text-gray-500">#{userId}</span>
    ) : (
      <span className="text-gray-300">—</span>
    );
  }
  const primary = user.name || user.email || `#${user.id}`;
  return (
    <div className="max-w-[180px]">
      <div className="text-gray-900 truncate" title={primary}>
        {primary}
      </div>
      <div className="text-xs text-gray-500 truncate">
        {user.role ? userRoleLabel(user.role) : ""}
        <span className="ml-1 font-mono text-gray-400">#{user.id}</span>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 py-1">
      <span className="text-xs font-medium text-gray-500 w-28 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 break-all min-w-0">{children}</span>
    </div>
  );
}

function MetaBlock({ meta }: { meta: Record<string, unknown> | null | undefined }) {
  if (!meta || Object.keys(meta).length === 0) return null;
  return (
    <pre className="mt-1 text-[11px] bg-white border border-gray-200 rounded p-2 overflow-x-auto max-h-40">
      {JSON.stringify(meta, null, 2)}
    </pre>
  );
}

function HistoryRowDetail({
  id,
  onFilter,
}: {
  id: number;
  onFilter: (updates: Partial<NotificationHistoryFilters>) => void;
}) {
  const { data, isLoading, error } = useNotificationHistoryEntry(id);
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <LoadingSpinner size="sm" />
        Načítám průběh…
      </div>
    );
  }
  if (error || !data) {
    return <p className="text-sm text-red-600">{errorMessage(error, "Detail se nepodařilo načíst.")}</p>;
  }
  const stamps = TIMESTAMPS.filter((t) => data[t.key]);
  return (
    <div className="space-y-4">
      <div className="grid gap-x-6 md:grid-cols-2">
        <div>
          <DetailRow label="ID notifikace">
            <span className="font-mono text-xs">{data.notification_id}</span>
          </DetailRow>
          <DetailRow label="Push">{data.push_status ? pushStatusLabel(data.push_status) : "—"}</DetailRow>
          <DetailRow label="Odkaz">
            {data.deep_link ? <span className="font-mono text-xs">{data.deep_link}</span> : "—"}
          </DetailRow>
          {data.failure_reason && (
            <DetailRow label="Chyba">
              <span className="text-red-700">{data.failure_reason}</span>
            </DetailRow>
          )}
        </div>
        <div>
          {stamps.map((t) => (
            <DetailRow key={t.key} label={t.label}>
              <span className="tabular-nums">{formatDateTime(data[t.key] as string)}</span>
            </DetailRow>
          ))}
        </div>
      </div>

      {(data.title || data.body) && (
        <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
          <div className="font-semibold text-gray-900">{data.title}</div>
          {data.body && <div className="text-gray-700 whitespace-pre-wrap">{data.body}</div>}
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Průběh</p>
        {data.events.length === 0 ? (
          <p className="text-sm text-gray-400">Bez zaznamenaných událostí</p>
        ) : (
          <ol className="relative border-l border-gray-200 ml-1.5 space-y-2">
            {data.events.map((ev) => (
              <li key={ev.id} className="ml-4">
                <span
                  className={cn(
                    "absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border border-white",
                    ev.event === "failed" || ev.event === "decision.reject"
                      ? "bg-red-500"
                      : ev.event.startsWith("decision.")
                        ? "bg-amber-400"
                        : "bg-blue-500"
                  )}
                />
                <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="text-xs text-gray-500 tabular-nums">{formatDateTime(ev.created_at)}</span>
                  <span className="text-gray-900">{eventLabel(ev.event)}</span>
                  {ev.reason && (
                    <span className="text-gray-600">
                      · {reasonLabel(ev.reason)} <span className="font-mono text-[11px] text-gray-400">{ev.reason}</span>
                    </span>
                  )}
                </div>
                <MetaBlock meta={ev.meta} />
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {data.user && (
          <Button variant="secondary" size="sm" onClick={() => onFilter({ user_id: String(data.user!.id) })}>
            Jen tento příjemce
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => onFilter({ type: data.type_key })}>
          Jen tento typ
        </Button>
      </div>
    </div>
  );
}

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
        Celkem {total} {pluralCs(total, "záznam", "záznamy", "záznamů")}
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

/**
 * Historie tab (NOTIF-8): every delivered notification with its furthest
 * state, filterable via the URL like the audit log; a row expands into its
 * event timeline. „Potlačeno“ switches the list to the decision log (what was
 * suppressed or rejected and why). CSV export takes the same filters.
 */
export function NotificationHistorySection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchKey = searchParams.toString();
  const filters = useMemo(
    () =>
      readFilters<NotificationHistoryFilters>(new URLSearchParams(searchKey), HISTORY_FILTER_KEYS, EMPTY_HISTORY_FILTERS),
    [searchKey]
  );
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const { data, isLoading, isFetching, error } = useNotificationHistory(filters, page);
  const { data: types } = useNotificationTypes();

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const typeOptions = useMemo(
    () =>
      Object.fromEntries(
        [...(types ?? [])].sort((a, b) => a.name.localeCompare(b.name, "cs")).map((t) => [t.key, t.name])
      ),
    [types]
  );
  const typeName = (key: string | null | undefined, fallback?: string | null) =>
    fallback || (key ? typeOptions[key] ?? key : "—");

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
    (updates: Partial<NotificationHistoryFilters>) => {
      setExportError(null);
      setExpandedId(null);
      updateParams({ ...updates, page: null });
    },
    [updateParams]
  );
  const setFilter = (key: keyof NotificationHistoryFilters) => (value: string) => setFilters({ [key]: value });

  const setPage = (next: number) => {
    setExpandedId(null);
    updateParams({ page: next === 1 ? null : String(next) });
  };

  const hasActiveFilters = HISTORY_FILTER_KEYS.some((k) => filters[k] !== "");
  const clearFilters = () =>
    setFilters(Object.fromEntries(HISTORY_FILTER_KEYS.map((k) => [k, ""])) as Partial<NotificationHistoryFilters>);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await downloadNotificationHistoryExport(filters);
    } catch (err) {
      setExportError(errorMessage(err, "Export selhal"));
    } finally {
      setExporting(false);
    }
  };

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const decisionMode = filters.result === "suppressed";

  return (
    <div className="space-y-4">
      <QueueHealthStrip />

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
        <IdFilter label="Uživatel (ID)" value={filters.user_id} onCommit={setFilter("user_id")} />
        <SelectFilter label="Typ" value={filters.type} options={typeOptions} onChange={setFilter("type")} allLabel="Všechny typy" />
        <SelectFilter label="Kanál" value={filters.channel} options={NOTIFICATION_CHANNEL_LABELS} onChange={setFilter("channel")} />
        <SelectFilter label="Výsledek" value={filters.result} options={NOTIFICATION_RESULT_LABELS} onChange={setFilter("result")} />
        <SelectFilter label="Zdroj" value={filters.source} options={NOTIFICATION_SOURCE_LABELS} onChange={setFilter("source")} />
        <SelectFilter
          label="Testovací"
          value={filters.is_test}
          options={{ "1": "Jen testovací", "0": "Bez testovacích" }}
          onChange={setFilter("is_test")}
        />
        <IdFilter label="Rozesílka (ID)" value={filters.broadcast_id} onCommit={setFilter("broadcast_id")} />
      </div>

      {filters.broadcast_id && (
        <p className="text-xs text-gray-500">
          Jen notifikace rozesílky{" "}
          <Link href={`/admin/notifications/broadcasts/${filters.broadcast_id}`} className="text-blue-600 hover:underline">
            #{filters.broadcast_id}
          </Link>
          .
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500 tabular-nums">
          {meta ? `${meta.total} ${pluralCs(meta.total, "záznam", "záznamy", "záznamů")}` : ""}
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
          onClick={handleExport}
          isLoading={exporting}
          disabled={exporting || meta?.total === 0}
        >
          {!exporting && <Download className="w-4 h-4" />}
          Export CSV
        </Button>
      </div>

      {exportError && <Banner tone="error" onClose={() => setExportError(null)}>{exportError}</Banner>}

      {meta?.summary && !decisionMode && <SummaryCounters summary={meta.summary} />}

      {error && data && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage(error, "Historii se nepodařilo načíst")}</span>
        </div>
      )}

      {isLoading && !data ? (
        <LoadingPage message="Načítám historii notifikací…" />
      ) : error && !data ? (
        <div className="flex flex-col items-center justify-center min-h-[240px] gap-3 text-center">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <p className="text-gray-600">Historii notifikací se nepodařilo načíst</p>
          <p className="text-sm text-gray-400">{errorMessage(error, "Neznámá chyba")}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">
            {hasActiveFilters ? "Žádné záznamy neodpovídají filtrům" : "Zatím nebyla odeslána žádná notifikace"}
          </p>
        </div>
      ) : (
        <div className={cn("bg-white rounded-lg border border-gray-200 overflow-hidden", isFetching && "opacity-60")}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {decisionMode ? (
                    <>
                      <th className="px-3 py-3 whitespace-nowrap">Čas</th>
                      <th className="px-3 py-3">Příjemce</th>
                      <th className="px-3 py-3">Typ</th>
                      <th className="px-3 py-3">Rozhodnutí</th>
                      <th className="px-3 py-3">Důvod</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-3 whitespace-nowrap">Čas</th>
                      <th className="px-3 py-3">Příjemce</th>
                      <th className="px-3 py-3">Typ</th>
                      <th className="px-3 py-3">Zdroj</th>
                      <th className="px-3 py-3">Kanály</th>
                      <th className="px-3 py-3">Stav</th>
                      <th className="px-3 py-3">Titulek</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const expanded = expandedId === row.id;
                  const toggle = () => setExpandedId(expanded ? null : row.id);
                  const rowProps = {
                    onClick: toggle,
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggle();
                      }
                    },
                    tabIndex: 0,
                    "aria-expanded": expanded,
                  };
                  const timeCell = (iso: string) => (
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <ChevronDown
                          className={cn("w-3.5 h-3.5 text-gray-400 transition-transform", !expanded && "-rotate-90")}
                        />
                        {formatDateTime(iso)}
                      </span>
                    </td>
                  );

                  if (isEventRow(row)) {
                    return (
                      <Fragment key={`e-${row.id}`}>
                        <tr
                          {...rowProps}
                          className={cn(
                            "border-b border-gray-100 cursor-pointer transition-colors align-top",
                            expanded ? "bg-blue-50/40" : "hover:bg-gray-50"
                          )}
                        >
                          {timeCell(row.created_at)}
                          <td className="px-3 py-2.5">
                            <UserCell user={row.user} userId={row.user_id} />
                          </td>
                          <td className="px-3 py-2.5 min-w-[140px]">
                            <div className="text-gray-900">{typeName(row.type_key)}</div>
                            {row.type_key && <div className="font-mono text-[11px] text-gray-400">{row.type_key}</div>}
                          </td>
                          <td className="px-3 py-2.5">
                            <Pill className={DECISION_PILL[row.event]}>{eventLabel(row.event)}</Pill>
                          </td>
                          <td className="px-3 py-2.5 min-w-[140px]">
                            <div className="text-gray-900">{reasonLabel(row.reason)}</div>
                            {row.reason && <div className="font-mono text-[11px] text-gray-400">{row.reason}</div>}
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <td colSpan={5} className="px-4 py-3">
                              <div className="text-xs text-gray-600 space-x-3">
                                {row.rule_id ? (
                                  <Link href={`/admin/notifications/rules/${row.rule_id}`} className="text-blue-600 hover:underline">
                                    Pravidlo #{row.rule_id}
                                  </Link>
                                ) : null}
                                {row.broadcast_id ? (
                                  <Link
                                    href={`/admin/notifications/broadcasts/${row.broadcast_id}`}
                                    className="text-blue-600 hover:underline"
                                  >
                                    Rozesílka #{row.broadcast_id}
                                  </Link>
                                ) : null}
                              </div>
                              <MetaBlock meta={row.meta} />
                              {!row.meta && !row.rule_id && !row.broadcast_id && (
                                <p className="text-xs text-gray-400">Bez dalších podrobností.</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  }

                  const failed = row.status === "failed";
                  return (
                    <Fragment key={row.id}>
                      <tr
                        {...rowProps}
                        className={cn(
                          "border-b border-gray-100 cursor-pointer transition-colors align-top",
                          failed ? "bg-red-50/60 hover:bg-red-50" : expanded ? "bg-blue-50/40" : "hover:bg-gray-50"
                        )}
                      >
                        {timeCell(row.created_at)}
                        <td className="px-3 py-2.5">
                          <UserCell user={row.user} />
                        </td>
                        <td className="px-3 py-2.5 min-w-[140px]">
                          <div className="text-gray-900">{typeName(row.type_key, row.type_name)}</div>
                          <div className="font-mono text-[11px] text-gray-400">{row.type_key}</div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">
                          {sourceLabel(row.source)}
                          {row.is_test && <Pill className="ml-1 bg-purple-50 text-purple-700">test</Pill>}
                        </td>
                        <td className="px-3 py-2.5 text-xs">{channelsLabel(row.channels)}</td>
                        <td className="px-3 py-2.5">
                          <Pill className={STATUS_PILL[row.status]}>{statusLabel(row.status)}</Pill>
                          {row.push_status && (
                            <div className="mt-0.5 text-[11px] text-gray-500 whitespace-nowrap">
                              push: {pushStatusLabel(row.push_status)}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 max-w-[200px]">
                          <div className="truncate text-gray-700" title={row.title ?? undefined}>
                            {row.title || "—"}
                          </div>
                          {row.failure_reason && (
                            <div className="truncate text-[11px] text-red-600" title={row.failure_reason}>
                              {row.failure_reason}
                            </div>
                          )}
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <td colSpan={7} className="px-4 py-4">
                            <HistoryRowDetail id={row.id} onFilter={setFilters} />
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
            <Pagination page={meta.page} lastPage={meta.last_page} total={meta.total} onPageChange={setPage} />
          )}
        </div>
      )}
    </div>
  );
}
