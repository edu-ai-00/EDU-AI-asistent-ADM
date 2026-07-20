"use client";

import { useState } from "react";
import { useCourses } from "@/hooks/useCourses";
import {
  useBackfillPreview,
  useBackfillRun,
  useBackfillTimestamps,
  type BackfillPreview,
  type BackfillResult,
  type TimestampBackfillResult,
} from "@/hooks/useEloBackfill";
import { Button } from "@/components/ui/Button";
import {
  ChevronDown,
  Eye,
  Play,
  CheckCircle2,
  AlertTriangle,
  Users,
  Blocks,
  Zap,
  Clock,
  Timer,
} from "lucide-react";

export default function EloBackfillPage() {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [previewCourseId, setPreviewCourseId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<BackfillResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [timestampResult, setTimestampResult] =
    useState<TimestampBackfillResult | null>(null);
  // When on, the timestamp backfill also reprocesses rows currently at
  // duration_ms = 0 (left over from a buggy earlier run). Rows with real
  // positive durations are never touched, even with this flag on.
  const [timestampForce, setTimestampForce] = useState(false);
  // Cumulative counters across the per-call pagination loop. Reset on each
  // new operation (Dry run / Spustit backfill) so the UI shows totals for
  // the current op, not the last one.
  const [timestampProgress, setTimestampProgress] = useState<{
    processed: number;
    lessonFilled: number;
    quizFilled: number;
    unresolved: number;
    remaining: number | null;
    running: boolean;
  }>({
    processed: 0,
    lessonFilled: 0,
    quizFilled: 0,
    unresolved: 0,
    remaining: null,
    running: false,
  });

  const { data: courses, isLoading: coursesLoading } = useCourses();
  const {
    data: preview,
    isLoading: previewLoading,
    refetch: refetchPreview,
  } = useBackfillPreview(previewCourseId);
  const backfillRun = useBackfillRun();
  const backfillTimestamps = useBackfillTimestamps();

  /**
   * Drive the timestamp backfill. The server processes at most ~1500 rows
   * per call (Cloudflare cuts at 120 s), so for large courses we loop the
   * endpoint until `done: true`. Dry runs always finish in one call.
   *
   * Progress counters live in `timestampProgress` so the UI shows
   * cumulative totals while the loop runs.
   */
  const handleTimestampBackfill = async (dryRun: boolean) => {
    if (!selectedCourseId) return;

    setTimestampResult(null);
    setTimestampProgress({
      processed: 0,
      lessonFilled: 0,
      quizFilled: 0,
      unresolved: 0,
      remaining: null,
      running: true,
    });

    // Hard ceiling on iterations as a safety net — at 1500 rows/call this
    // covers 75 000 rows per course, far above current realistic volume.
    const MAX_ITERATIONS = 50;

    try {
      let last: TimestampBackfillResult | null = null;
      for (let i = 0; i < MAX_ITERATIONS; i++) {
        const result = await backfillTimestamps.mutateAsync({
          courseId: selectedCourseId,
          dryRun,
          force: timestampForce,
        });
        last = result;

        setTimestampProgress((prev) => ({
          processed: prev.processed + result.processed,
          lessonFilled: prev.lessonFilled + result.lesson_filled,
          quizFilled: prev.quizFilled + result.quiz_filled,
          unresolved: prev.unresolved + result.unresolved,
          remaining: result.total_remaining,
          running: !result.done,
        }));

        if (result.done) break;
      }
      setTimestampResult(last);
    } catch {
      // Error surfaces via backfillTimestamps.error
    } finally {
      setTimestampProgress((prev) => ({ ...prev, running: false }));
    }
  };

  const handlePreview = () => {
    if (!selectedCourseId) return;
    setRunResult(null);
    setPreviewCourseId(selectedCourseId);
  };

  const handleRun = () => {
    if (!selectedCourseId) return;
    setShowConfirm(true);
  };

  const handleConfirmRun = async () => {
    if (!selectedCourseId) return;
    setShowConfirm(false);
    try {
      const result = await backfillRun.mutateAsync({ courseId: selectedCourseId });
      setRunResult(result);
      // Refresh preview to show updated counts
      refetchPreview();
    } catch {
      // Error is available via backfillRun.error
    }
  };

  const handleRunForUser = async (userId: number) => {
    if (!selectedCourseId) return;
    try {
      const result = await backfillRun.mutateAsync({ courseId: selectedCourseId, userId });
      setRunResult(result);
      refetchPreview();
    } catch {
      // Error is available via backfillRun.error
    }
  };

  const selectedCourse = courses?.find(
    (c) => c.course_id === selectedCourseId
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ELO Backfill</h1>
        <p className="text-sm text-gray-500 mt-1">
          Retroactively compute ELO updates for users who completed course
          content before the ELO system was added.
        </p>
      </div>

      {/* Course selector + actions */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kurz
          </label>
          <div className="relative">
            <select
              value={selectedCourseId ?? ""}
              onChange={(e) => {
                setSelectedCourseId(e.target.value || null);
                setPreviewCourseId(null);
                setRunResult(null);
              }}
              className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              disabled={coursesLoading}
            >
              <option value="">
                {coursesLoading ? "Načítání..." : "Vyberte kurz..."}
              </option>
              {courses?.map((course) => (
                <option key={course.id} value={course.course_id}>
                  {course.emoji ? `${course.emoji} ` : ""}
                  {course.name} (v{course.version})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <Button
          onClick={handlePreview}
          variant="secondary"
          disabled={!selectedCourseId || previewLoading}
          isLoading={previewLoading}
        >
          <Eye className="w-4 h-4" />
          Preview
        </Button>

        <Button
          onClick={handleRun}
          disabled={
            !selectedCourseId ||
            !preview ||
            preview.pending_pairs === 0 ||
            backfillRun.isPending
          }
          isLoading={backfillRun.isPending}
        >
          <Play className="w-4 h-4" />
          Run Backfill
        </Button>
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                Potvrdit backfill pro kurz &quot;{selectedCourse?.name}&quot;?
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Tato akce vytvoří {preview?.pending_pairs ?? 0} ELO interakcí a
                aktualizuje uživatelské profily. Operaci nelze vrátit zpět.
              </p>
              <div className="flex gap-2 mt-3">
                <Button onClick={handleConfirmRun} size="sm">
                  Potvrdit
                </Button>
                <Button
                  onClick={() => setShowConfirm(false)}
                  variant="ghost"
                  size="sm"
                >
                  Zrušit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview stats */}
      {preview && (
        <PreviewStats
          preview={preview}
          onRunForUser={handleRunForUser}
          isRunning={backfillRun.isPending}
        />
      )}

      {/* Run results */}
      {runResult && <RunResults result={runResult} />}

      {/* Timestamp backfill — populates opened_at / confirmed_at /
          duration_ms on historical elo_interactions rows so the CSV
          export shows per-block solving times for lessons and quizzes. */}
      <div className="rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Timer className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900">
              Backfill časových razítek (Doba řešení)
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              Doplní <code className="bg-gray-100 px-1 rounded">opened_at</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">confirmed_at</code> a{" "}
              <code className="bg-gray-100 px-1 rounded">duration_ms</code> na
              existující ELO interakce. Lekce: skutečné časy z{" "}
              <code className="bg-gray-100 px-1 rounded">progress_data</code>.
              Kvízy: dopočet z rozdílů <code className="bg-gray-100 px-1 rounded">created_at</code>{" "}
              v rámci sezení (≤ 30 min), clamped 3 s – 5 min.
              Slouží jako fallback pro historická data — nová verze appky už
              posílá razítka přímo.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Při běhu se přepisují <strong>jen</strong> řádky bez časových
              razítek nebo s <code className="bg-gray-100 px-1 rounded">duration_ms = 0</code>{" "}
              (pozůstatek po starší vadné verzi). Řádky s reálnou nenulovou
              dobou (poslané přímo z aplikace) backfill nikdy nepřepíše,
              takže opakované spuštění je bezpečné.
            </p>
          </div>
        </div>
        <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={timestampForce}
            onChange={(e) => setTimestampForce(e.target.checked)}
            className="mt-0.5 rounded border-gray-300"
          />
          <span>
            <strong>Re-run i&nbsp;na již zpracovaná data</strong> – přidá řádky
            s <code className="bg-gray-100 px-1 rounded">duration_ms = 0</code> do
            výběru (oprava po Carbon&nbsp;3 chybě). Reálné nenulové hodnoty
            zůstávají nedotčené.
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleTimestampBackfill(true)}
            variant="secondary"
            size="sm"
            disabled={!selectedCourseId || backfillTimestamps.isPending}
            isLoading={
              backfillTimestamps.isPending && timestampResult?.dry_run !== false
            }
          >
            <Eye className="w-4 h-4" />
            Dry run
          </Button>
          <Button
            onClick={() => handleTimestampBackfill(false)}
            size="sm"
            disabled={!selectedCourseId || backfillTimestamps.isPending}
            isLoading={
              backfillTimestamps.isPending && timestampResult?.dry_run === false
            }
          >
            <Play className="w-4 h-4" />
            Spustit backfill{timestampForce ? " (re-run)" : ""}
          </Button>
        </div>
        {(timestampResult !== null ||
          timestampProgress.running ||
          timestampProgress.processed > 0) && (
          <div className="rounded-md bg-gray-50 border border-gray-200 p-3 text-xs space-y-1">
            <p className="font-medium text-gray-900">
              {timestampProgress.running
                ? "Probíhá…"
                : timestampResult?.dry_run
                  ? "Náhled"
                  : "Hotovo"}
              {selectedCourseId && (
                <>
                  {" – kurz "}
                  <code>{selectedCourseId}</code>
                </>
              )}
            </p>
            {timestampProgress.processed === 0 &&
            !timestampProgress.running &&
            timestampProgress.remaining === 0 ? (
              <p className="text-gray-700">
                Žádné řádky k doplnění — všechny záznamy už mají časová
                razítka. Pro přepsání rozbitých nulových hodnot zaškrtni
                <strong> Re-run i na již zpracovaná data</strong>.
              </p>
            ) : (
              <ul className="text-gray-700 list-disc list-inside">
                <li>Zpracováno: {timestampProgress.processed}</li>
                <li>Lesson filled: {timestampProgress.lessonFilled}</li>
                <li>Quiz filled: {timestampProgress.quizFilled}</li>
                {timestampProgress.remaining !== null && (
                  <li>
                    Zbývá: <strong>{timestampProgress.remaining}</strong>{" "}
                    {timestampProgress.running && "(pokračuje další dávka…)"}
                  </li>
                )}
                {timestampProgress.unresolved > 0 && (
                  <li className="text-amber-700">
                    Unresolved: {timestampProgress.unresolved}
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
        {backfillTimestamps.error && (
          <p className="text-xs text-red-700">
            Chyba: {(backfillTimestamps.error as Error).message}
          </p>
        )}
      </div>

      {/* Error display */}
      {backfillRun.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Chyba: {(backfillRun.error as Error).message}
          </p>
        </div>
      )}
    </div>
  );
}

function PreviewStats({
  preview,
  onRunForUser,
  isRunning,
}: {
  preview: BackfillPreview;
  onRunForUser: (userId: number) => void;
  isRunning: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="w-4 h-4" />}
          label="Uživatelé s progressem"
          value={preview.total_users_with_progress}
        />
        <StatCard
          icon={<Blocks className="w-4 h-4" />}
          label="Bloky s GPF vektory"
          value={`${preview.blocks_with_gpf} / ${preview.blocks_total}`}
        />
        <StatCard
          icon={<Zap className="w-4 h-4" />}
          label="Existující interakce"
          value={preview.existing_interactions}
        />
        <StatCard
          icon={<Clock className="w-4 h-4" />}
          label="Pending k backfillu"
          value={preview.pending_pairs}
          highlight={preview.pending_pairs > 0}
        />
      </div>

      {/* User detail table */}
      {preview.users.length > 0 && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Uživatel
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Attempted
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Existing
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Pending
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Akce
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preview.users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {user.name}
                    <span className="text-gray-400 ml-1">#{user.id}</span>
                  </td>
                  <td className="px-4 py-2 text-sm text-right text-gray-600">
                    {user.blocks_attempted}
                  </td>
                  <td className="px-4 py-2 text-sm text-right text-gray-600">
                    {user.already_processed}
                  </td>
                  <td className="px-4 py-2 text-sm text-right">
                    <span
                      className={
                        user.pending > 0
                          ? "font-medium text-blue-600"
                          : "text-gray-400"
                      }
                    >
                      {user.pending}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {user.pending > 0 && (
                      <button
                        onClick={() => onRunForUser(user.id)}
                        disabled={isRunning}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        Run
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RunResults({ result }: { result: BackfillResult }) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="font-medium text-green-800">Backfill dokončen</span>
        </div>
        <ul className="text-sm text-green-700 space-y-1 ml-7">
          <li>{result.users_processed} uživatelů zpracováno</li>
          <li>{result.interactions_created} interakcí vytvořeno</li>
          <li>{result.profiles_updated} profilů aktualizováno</li>
          <li>{result.block_stats_updated} block stats aktualizováno</li>
        </ul>
      </div>

      {/* Errors */}
      {result.errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800 mb-2">
            Chyby ({result.errors.length}):
          </p>
          <ul className="text-sm text-red-700 space-y-1">
            {result.errors.map((err, i) => (
              <li key={i}>
                User #{err.user_id}: {err.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Per-user details */}
      {result.details.length > 0 && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Uživatel
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Interakce
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Avg ELO
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.details.map((detail) => (
                <tr key={detail.user_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {detail.user_name}
                    <span className="text-gray-400 ml-1">
                      #{detail.user_id}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-right">
                    <span
                      className={
                        detail.interactions > 0
                          ? "font-medium text-blue-600"
                          : "text-gray-400"
                      }
                    >
                      {detail.interactions}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-right text-gray-600">
                    {detail.final_avg_elo !== null
                      ? detail.final_avg_elo.toFixed(2)
                      : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight
          ? "border-blue-200 bg-blue-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-1.5 text-gray-500 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p
        className={`text-lg font-semibold ${
          highlight ? "text-blue-700" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
