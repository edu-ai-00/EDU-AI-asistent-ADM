"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { useClassrooms } from "@/hooks/useClassrooms";
import { useActivityReport, activityQueryString } from "@/hooks/useActivity";
import { api } from "@/lib/api/client";
import type { ActivityRow } from "@/types/api";

// ── Helpers ──────────────────────────────────────────────────────────────────

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return { from: isoDay(from), to: isoDay(to) };
}

function formatWork(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
}

function formatDay(day: string): string {
  const [y, m, d] = day.split("-");
  return `${d}. ${m}. ${y}`;
}

// Column order matches the CSV export; `sum` marks columns totalled in the
// footer (XP is a current balance, not a per-day event, so it is not summed).
type NumericKey = {
  [K in keyof ActivityRow]: ActivityRow[K] extends number ? K : never;
}[keyof ActivityRow];

const COLUMNS: { key: NumericKey; label: string; title?: string; sum?: boolean }[] = [
  { key: "work_seconds", label: "Čas práce", sum: true },
  { key: "courses_visited", label: "Kurzy", title: "Počet navštívených kurzů", sum: true },
  { key: "blocks_visited", label: "Bloky", title: "Počet bloků v kurzech (všechny navštívené)", sum: true },
  { key: "practice_blocks", label: "Procvičování", title: "Počet bloků procvičování", sum: true },
  { key: "quiz_blocks", label: "Kvíz", title: "Počet bloků kvíz", sum: true },
  { key: "chats", label: "Chaty", title: "Počet chatů, do kterých žák ten den psal", sum: true },
  { key: "news_opened", label: "Novinky", title: "Počet otevřených novinek", sum: true },
  { key: "avatar_purchases", label: "Avatar", title: "Počet úprav avatara (zatím jen nákupy)", sum: true },
  { key: "games", label: "Hry", title: "Počet her", sum: true },
  { key: "xp_points", label: "XP", title: "Aktuální stav XP" },
];

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Per-student daily activity overview (BR-AT7X2T): one row per student and
 * day, filterable by classroom and date range, exportable as CSV.
 */
export function ActivitySection() {
  const [{ from, to }, setRange] = useState(defaultRange);
  const [classroomId, setClassroomId] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const filters = { classroomId, from, to };
  const { data: classrooms } = useClassrooms();
  const { data, isLoading, isFetching, error } = useActivityReport(filters);

  const classroomNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of classrooms ?? []) map.set(c.id, c.name);
    return map;
  }, [classrooms]);

  const rows = data?.rows ?? [];

  const totals = useMemo(() => {
    const t: Partial<Record<keyof ActivityRow, number>> = {};
    for (const col of COLUMNS) {
      if (!col.sum) continue;
      t[col.key] = rows.reduce((acc, r) => acc + (r[col.key] as number), 0);
    }
    return t;
  }, [rows]);

  const studentDays = rows.length;
  const students = new Set(rows.map((r) => r.user_id)).size;

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const response = await api.getRaw(
        `/admin/activity/export${activityQueryString(filters)}`,
        "text/csv"
      );
      if (!response.ok) throw new Error(`Export selhal (${response.status})`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aktivita-${from || "vse"}_${to || isoDay(new Date())}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export selhal");
    } finally {
      setIsExporting(false);
    }
  };

  const inputClass =
    "px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3" data-print-hide>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Třída
          <select
            className={inputClass}
            value={classroomId ?? ""}
            onChange={(e) => setClassroomId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Všechny třídy</option>
            {(classrooms ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Od
          <input
            type="date"
            className={inputClass}
            value={from}
            max={to || undefined}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Do
          <input
            type="date"
            className={inputClass}
            value={to}
            min={from || undefined}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          />
        </label>
        <div className="flex-1" />
        <Button
          variant="secondary"
          onClick={handleExport}
          isLoading={isExporting}
          disabled={rows.length === 0}
        >
          <Download className="w-4 h-4" />
          Stáhnout CSV
        </Button>
      </div>

      {(error || exportError) && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{exportError ?? (error instanceof Error ? error.message : "Nepodařilo se načíst data")}</span>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Jeden řádek = jeden žák a jeden den s aktivitou (dny v {data?.meta.timezone ?? "Europe/Prague"}).
        Čas práce se počítá z aktivity v lekcích a kvízech; zařízení a úpravy oblečení avatara zatím
        aplikace neloguje.
        {rows.length > 0 && (
          <>
            {" "}Zobrazeno: {students} žáků, {studentDays} dnů.
          </>
        )}
      </p>

      {/* Table */}
      {isLoading ? (
        <LoadingPage />
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
          Pro zvolené filtry nejsou žádné záznamy aktivity.
        </div>
      ) : (
        <div className={`overflow-x-auto border border-gray-200 rounded-lg ${isFetching ? "opacity-60" : ""}`}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Žák</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Třída</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Den</th>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    title={c.title}
                    className="px-3 py-2 text-right font-medium whitespace-nowrap"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={`${r.user_id}-${r.day}`} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="text-gray-900">{r.user_name || "—"}</span>
                    <span className="ml-1.5 text-xs text-gray-400 font-mono">#{r.user_id}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                    {r.classroom_ids.length > 0 ? (
                      r.classroom_ids.map((id, i) => (
                        <span key={id}>
                          {i > 0 && ", "}
                          {classroomNames.get(id) ?? ""}
                          <span className="ml-1.5 text-xs text-gray-400 font-mono">#{id}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700 tabular-nums">{formatDay(r.day)}</td>
                  {COLUMNS.map((c) => {
                    const v = r[c.key] as number;
                    return (
                      <td
                        key={c.key}
                        className={`px-3 py-2 text-right tabular-nums ${v === 0 ? "text-gray-300" : "text-gray-900"}`}
                      >
                        {c.key === "work_seconds" ? formatWork(v) : v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 text-xs font-medium text-gray-700">
              <tr>
                <td className="px-3 py-2" colSpan={3}>
                  Celkem
                </td>
                {COLUMNS.map((c) => (
                  <td key={c.key} className="px-3 py-2 text-right tabular-nums">
                    {c.sum
                      ? c.key === "work_seconds"
                        ? formatWork(totals[c.key] ?? 0)
                        : totals[c.key]
                      : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
