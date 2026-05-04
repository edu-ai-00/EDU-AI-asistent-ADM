"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  Info,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { UserSearchPicker } from "@/components/admin/UserSearchPicker";
import { useMergePreview, useMergeUsers } from "@/hooks/useUserMerge";
import { ApiError } from "@/lib/api/client";
import type { AdminUser } from "@/types/api";
import type {
  MergeCourseDiff,
  MergePreview,
  MergeSectionDiff,
  MergeUserSummary,
} from "@/types/user-merge";

// ── Props ────────────────────────────────────────────────────────────────────

interface MergeUsersDialogProps {
  open: boolean;
  onClose: () => void;
}

// Step state machine
type Step = "pick" | "compare" | "confirm";

const CONFIRM_PHRASE = "SLOUCIT";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Ano" : "Ne";
  if (typeof value === "number") return value.toLocaleString();
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === "string") {
    // ISO date heuristic
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      try {
        return new Date(value).toLocaleString();
      } catch {
        return value;
      }
    }
    return value;
  }
  return JSON.stringify(value);
}

function formatDuration(secs: number | null | undefined): string {
  if (secs == null) return "—";
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

// Build a fallback section-diff array from raw user summaries when the
// backend doesn't break out diffs.
function buildIdentityDiff(
  source: MergeUserSummary,
  target: MergeUserSummary,
  result?: Partial<MergeUserSummary>
): MergeSectionDiff[] {
  const fields: { field: string; label: string; pick: (u: Partial<MergeUserSummary>) => unknown }[] = [
    { field: "name", label: "Jméno", pick: (u) => u.name },
    { field: "email", label: "E-mail", pick: (u) => u.email },
    { field: "login_code", label: "PIN", pick: (u) => u.login_code },
    { field: "role", label: "Role", pick: (u) => u.role },
    { field: "classroom_name", label: "Třída", pick: (u) => u.classroom_name },
    { field: "created_at", label: "Vytvořen", pick: (u) => u.created_at },
    { field: "last_login_at", label: "Poslední přihlášení", pick: (u) => u.last_login_at },
  ];
  return fields.map(({ label, pick }) => ({
    field: label,
    source_value: pick(source),
    target_value: pick(target),
    result_value: result ? pick(result) : pick(target),
    winner: null,
  }));
}

function buildStatsDiff(
  source: MergeUserSummary,
  target: MergeUserSummary,
  result?: Partial<MergeUserSummary>
): MergeSectionDiff[] {
  const s = source.stats ?? {} as NonNullable<MergeUserSummary["stats"]>;
  const t = target.stats ?? {} as NonNullable<MergeUserSummary["stats"]>;
  const r = result?.stats ?? {} as NonNullable<MergeUserSummary["stats"]>;
  const fields: { field: string; key: keyof NonNullable<MergeUserSummary["stats"]>; combine: "sum" | "max" }[] = [
    { field: "XP body", key: "xp_points", combine: "sum" },
    { field: "Úroveň", key: "level", combine: "max" },
    { field: "Streak (dny)", key: "streak_days", combine: "max" },
    { field: "Achievementy", key: "achievements_count", combine: "max" },
    { field: "Kurzy", key: "courses_count", combine: "max" },
  ];
  return fields.map(({ field, key, combine }) => {
    const sv = s[key];
    const tv = t[key];
    const rv = r[key] ??
      (sv != null && tv != null
        ? combine === "sum"
          ? Number(sv) + Number(tv)
          : Math.max(Number(sv), Number(tv))
        : sv ?? tv);
    let winner: MergeSectionDiff["winner"] = null;
    if (typeof sv === "number" && typeof tv === "number") {
      if (sv > tv) winner = "source";
      else if (tv > sv) winner = "target";
      else winner = "tie";
    }
    return {
      field,
      source_value: sv,
      target_value: tv,
      result_value: rv,
      winner,
    };
  });
}

function buildCountsDiff(
  source: MergeUserSummary,
  target: MergeUserSummary,
  result?: Partial<MergeUserSummary>
): MergeSectionDiff[] {
  const s = source.counts ?? {};
  const t = target.counts ?? {};
  const r = result?.counts ?? {};
  const fields: { field: string; key: keyof NonNullable<MergeUserSummary["counts"]> }[] = [
    { field: "Pokusy o kvíz", key: "quiz_attempts" },
    { field: "Chaty", key: "chats" },
    { field: "Záložky", key: "bookmarks" },
    { field: "Achievementy", key: "achievements" },
    { field: "Kurzy", key: "courses" },
  ];
  return fields
    .filter(({ key }) => s[key] !== undefined || t[key] !== undefined)
    .map(({ field, key }) => {
      const sv = s[key];
      const tv = t[key];
      const rv = r[key] ?? ((sv ?? 0) + (tv ?? 0));
      let winner: MergeSectionDiff["winner"] = null;
      if (typeof sv === "number" && typeof tv === "number") {
        if (sv > tv) winner = "source";
        else if (tv > sv) winner = "target";
        else winner = "tie";
      }
      return {
        field,
        source_value: sv,
        target_value: tv,
        result_value: rv,
        winner,
      };
    });
}

// ── Reusable bits ────────────────────────────────────────────────────────────

function SectionTable({
  title,
  rows,
}: {
  title: string;
  rows: MergeSectionDiff[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
        {title}
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Pole</th>
            <th className="px-4 py-2 text-left font-medium">Zdroj</th>
            <th className="px-4 py-2 text-left font-medium">Cíl</th>
            <th className="px-4 py-2 text-left font-medium">Po sloučení</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`${row.field}-${idx}`} className="border-t border-gray-100">
              <td className="px-4 py-2 text-gray-600 font-medium whitespace-nowrap">
                {row.field}
              </td>
              <td
                className={`px-4 py-2 text-gray-900 ${
                  row.winner === "source" ? "bg-green-50 font-medium" : ""
                }`}
              >
                {formatValue(row.source_value)}
              </td>
              <td
                className={`px-4 py-2 text-gray-900 ${
                  row.winner === "target" ? "bg-green-50 font-medium" : ""
                }`}
              >
                {formatValue(row.target_value)}
              </td>
              <td className="px-4 py-2 text-blue-700 font-medium bg-blue-50/50">
                {formatValue(row.result_value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CoursesTable({ rows }: { rows: MergeCourseDiff[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
        Kurzy
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Kurz</th>
            <th className="px-4 py-2 text-center font-medium">Zdroj %</th>
            <th className="px-4 py-2 text-center font-medium">Cíl %</th>
            <th className="px-4 py-2 text-center font-medium">Čas (Z/C)</th>
            <th className="px-4 py-2 text-center font-medium">Po sloučení</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.course_id} className="border-t border-gray-100">
              <td className="px-4 py-2 text-gray-900">
                <div className="font-medium">{row.course_name}</div>
                <div className="text-xs text-gray-400 font-mono">{row.course_id}</div>
              </td>
              <td
                className={`px-4 py-2 text-center text-gray-900 ${
                  row.winner === "source" ? "bg-green-50 font-medium" : ""
                }`}
              >
                {row.source_progress_percent != null
                  ? `${Math.round(row.source_progress_percent)}%`
                  : "—"}
              </td>
              <td
                className={`px-4 py-2 text-center text-gray-900 ${
                  row.winner === "target" ? "bg-green-50 font-medium" : ""
                }`}
              >
                {row.target_progress_percent != null
                  ? `${Math.round(row.target_progress_percent)}%`
                  : "—"}
              </td>
              <td className="px-4 py-2 text-center text-xs text-gray-500">
                {formatDuration(row.source_time_spent_seconds)} /{" "}
                {formatDuration(row.target_time_spent_seconds)}
              </td>
              <td className="px-4 py-2 text-center text-blue-700 font-medium bg-blue-50/50">
                {row.result_progress_percent != null
                  ? `${Math.round(row.result_progress_percent)}%`
                  : "—"}
                <div className="text-xs text-gray-500 font-normal">
                  {formatDuration(row.result_time_spent_seconds)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main dialog ──────────────────────────────────────────────────────────────

export function MergeUsersDialog({ open, onClose }: MergeUsersDialogProps) {
  const [leftUser, setLeftUser] = useState<AdminUser | null>(null);
  const [rightUser, setRightUser] = useState<AdminUser | null>(null);
  // direction: which side is the merge SOURCE (the one that gets merged in)
  // Default: left→right (left is source, right is target/keeper).
  const [direction, setDirection] = useState<"left-source" | "right-source">(
    "left-source"
  );
  const [step, setStep] = useState<Step>("pick");
  const [confirmText, setConfirmText] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset state when dialog closes / opens.
  useEffect(() => {
    if (!open) {
      setLeftUser(null);
      setRightUser(null);
      setDirection("left-source");
      setStep("pick");
      setConfirmText("");
      setSubmitError(null);
    }
  }, [open]);

  const sourceUser = direction === "left-source" ? leftUser : rightUser;
  const targetUser = direction === "left-source" ? rightUser : leftUser;

  const sameUserPicked =
    leftUser !== null && rightUser !== null && leftUser.id === rightUser.id;

  const previewQuery = useMergePreview(
    sourceUser?.id ?? null,
    targetUser?.id ?? null,
    step === "compare" || step === "confirm"
  );

  const mergeMutation = useMergeUsers();

  const preview = previewQuery.data;

  // If preview returns direction_locked but our current direction is already
  // forced, no-op. If the server's winner is the OTHER side, swap silently
  // (matches spec §5.2 rule 5: server enforces email-vs-pin direction).
  useEffect(() => {
    if (!preview || !sourceUser || !targetUser) return;
    if (!preview.direction_locked) return;
    if (preview.winner_user_id === targetUser.id) return;
    // Server says the other user should be the keeper. Swap direction.
    setDirection((d) => (d === "left-source" ? "right-source" : "left-source"));
  }, [preview, sourceUser, targetUser]);

  if (!open) return null;

  // ── Step transitions ───────────────────────────────────────────────────────
  const canCompare = leftUser && rightUser && !sameUserPicked;

  function goToCompare() {
    if (!canCompare) return;
    setStep("compare");
  }

  function goToConfirm() {
    setStep("confirm");
    setConfirmText("");
    setSubmitError(null);
  }

  function backToPick() {
    setStep("pick");
  }

  function backToCompare() {
    setStep("compare");
    setConfirmText("");
    setSubmitError(null);
  }

  function swapDirection() {
    setDirection((d) => (d === "left-source" ? "right-source" : "left-source"));
  }

  async function handleSubmit() {
    if (!sourceUser || !targetUser) return;
    if (confirmText !== CONFIRM_PHRASE) return;
    setSubmitError(null);
    try {
      await mergeMutation.mutateAsync({
        sourceId: sourceUser.id,
        targetId: targetUser.id,
      });
      // Visual confirmation via alert (project pattern uses alert(); no toast lib)
      alert("Profily byly úspěšně sloučeny.");
      onClose();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.status === 410
            ? "Tento profil byl už sloučen do jiného účtu."
            : err.status === 422
              ? err.message || "Sloučení odmítnuto serverem."
              : err.message || "Sloučení selhalo, zkuste znovu."
          : err instanceof Error
            ? err.message
            : "Sloučení selhalo, zkuste znovu.";
      setSubmitError(msg);
    }
  }

  // Direction lock copy.
  const directionBannerText = preview?.direction_locked
    ? "Profil s e-mailem zůstane (PIN profil bude sloučen do něj)."
    : null;

  // Detect blocking errors from preview.
  const blockingError = useMemo(() => {
    if (previewQuery.error) {
      const e = previewQuery.error;
      if (e.status === 410) {
        return "Tento profil byl už sloučen do jiného účtu.";
      }
      if (e.status === 422) {
        // 422 messages from spec §8: already merged, admin/teacher, etc.
        return e.message || "Sloučení nelze provést pro tyto profily.";
      }
      return e.message || "Nepodařilo se načíst náhled sloučení.";
    }
    if (preview?.blocking_error) return preview.blocking_error;
    return null;
  }, [previewQuery.error, preview]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Spojit uživatele
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === "pick" && "Krok 1/3 – Vyberte dva profily"}
              {step === "compare" && "Krok 2/3 – Porovnejte a zvolte směr"}
              {step === "confirm" && "Krok 3/3 – Potvrzení"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === "pick" && (
            <PickStep
              leftUser={leftUser}
              rightUser={rightUser}
              onChangeLeft={setLeftUser}
              onChangeRight={setRightUser}
              sameUserPicked={sameUserPicked}
            />
          )}

          {step === "compare" && (
            <CompareStep
              sourceUser={sourceUser!}
              targetUser={targetUser!}
              direction={direction}
              onSwapDirection={swapDirection}
              previewLoading={previewQuery.isLoading || previewQuery.isFetching}
              preview={preview ?? null}
              blockingError={blockingError}
              directionBannerText={directionBannerText}
            />
          )}

          {step === "confirm" && (
            <ConfirmStep
              sourceUser={sourceUser!}
              targetUser={targetUser!}
              confirmText={confirmText}
              onChangeConfirm={setConfirmText}
              submitError={submitError}
              isSubmitting={mergeMutation.isPending}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div>
            {step !== "pick" && (
              <Button
                variant="ghost"
                onClick={step === "compare" ? backToPick : backToCompare}
                disabled={mergeMutation.isPending}
              >
                <ArrowLeft className="w-4 h-4" />
                Zpět
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={mergeMutation.isPending}
            >
              Zrušit
            </Button>
            {step === "pick" && (
              <Button onClick={goToCompare} disabled={!canCompare}>
                Porovnat
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
            {step === "compare" && (
              <Button
                onClick={goToConfirm}
                disabled={
                  !preview ||
                  !!blockingError ||
                  previewQuery.isLoading ||
                  previewQuery.isFetching
                }
              >
                Pokračovat
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
            {step === "confirm" && (
              <Button
                variant="danger"
                onClick={handleSubmit}
                disabled={
                  confirmText !== CONFIRM_PHRASE || mergeMutation.isPending
                }
                isLoading={mergeMutation.isPending}
              >
                Sloučit profily
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step components ──────────────────────────────────────────────────────────

function PickStep({
  leftUser,
  rightUser,
  onChangeLeft,
  onChangeRight,
  sameUserPicked,
}: {
  leftUser: AdminUser | null;
  rightUser: AdminUser | null;
  onChangeLeft: (u: AdminUser | null) => void;
  onChangeRight: (u: AdminUser | null) => void;
  sameUserPicked: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-900">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          Vyberte dva studentské profily, které patří jednomu skutečnému
          uživateli. V dalším kroku porovnáte data a určíte, který profil
          zůstane.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UserSearchPicker
          label="Profil A"
          value={leftUser}
          onChange={onChangeLeft}
          excludeId={rightUser?.id ?? null}
          autoFocus
        />
        <UserSearchPicker
          label="Profil B"
          value={rightUser}
          onChange={onChangeRight}
          excludeId={leftUser?.id ?? null}
        />
      </div>

      {sameUserPicked && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Vybrali jste stejný profil v obou panelech. Vyberte dva různé
            profily.
          </span>
        </div>
      )}
    </div>
  );
}

function CompareStep({
  sourceUser,
  targetUser,
  direction,
  onSwapDirection,
  previewLoading,
  preview,
  blockingError,
  directionBannerText,
}: {
  sourceUser: AdminUser;
  targetUser: AdminUser;
  direction: "left-source" | "right-source";
  onSwapDirection: () => void;
  previewLoading: boolean;
  preview: MergePreview | null;
  blockingError: string | null;
  directionBannerText: string | null;
}) {
  // Build the four section tables. If backend provides explicit diff arrays,
  // use those; otherwise synthesize from the raw user summaries.
  const identityRows = useMemo(() => {
    if (preview?.identity?.length) return preview.identity;
    if (preview?.source && preview?.target) {
      return buildIdentityDiff(preview.source, preview.target, preview.result);
    }
    return [];
  }, [preview]);

  const statsRows = useMemo(() => {
    if (preview?.stats?.length) return preview.stats;
    if (preview?.source && preview?.target) {
      return buildStatsDiff(preview.source, preview.target, preview.result);
    }
    return [];
  }, [preview]);

  const countsRows = useMemo(() => {
    if (preview?.counts?.length) return preview.counts;
    if (preview?.source && preview?.target) {
      return buildCountsDiff(preview.source, preview.target, preview.result);
    }
    return [];
  }, [preview]);

  const coursesRows = preview?.courses ?? [];

  return (
    <div className="space-y-4">
      {/* Direction banner / swap control */}
      <div className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg bg-white">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 uppercase tracking-wider">
              Zdroj (bude sloučen)
            </div>
            <div className="font-medium text-gray-900 truncate">
              {sourceUser.name}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {sourceUser.email || (
                <span className="italic text-gray-400">bez e-mailu</span>
              )}
              {sourceUser.login_code && ` • PIN ${sourceUser.login_code}`}
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 uppercase tracking-wider">
              Cíl (zůstane)
            </div>
            <div className="font-medium text-gray-900 truncate">
              {targetUser.name}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {targetUser.email || (
                <span className="italic text-gray-400">bez e-mailu</span>
              )}
              {targetUser.login_code && ` • PIN ${targetUser.login_code}`}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onSwapDirection}
          disabled={preview?.direction_locked === true}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={
            preview?.direction_locked
              ? "Směr sloučení je dán pravidly"
              : "Prohodit směr sloučení"
          }
        >
          {preview?.direction_locked ? (
            <Lock className="w-4 h-4" />
          ) : (
            <ArrowRightLeft className="w-4 h-4" />
          )}
          Prohodit
        </button>
      </div>

      {/* Direction lock banner */}
      {directionBannerText && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
          <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{directionBannerText}</span>
        </div>
      )}

      {/* Direction picker (when not locked) */}
      {!preview?.direction_locked && preview && (
        <div className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg bg-white text-sm">
          <span className="font-medium text-gray-700">Směr sloučení:</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="merge-direction"
              checked={direction === "left-source"}
              onChange={onSwapDirection}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span>Sloučit levý → pravý</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="merge-direction"
              checked={direction === "right-source"}
              onChange={onSwapDirection}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span>Sloučit pravý → levý</span>
          </label>
        </div>
      )}

      {/* Loading / error / preview */}
      {previewLoading && !preview && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="md" />
          <span className="ml-3 text-sm text-gray-500">
            Načítání náhledu sloučení...
          </span>
        </div>
      )}

      {blockingError && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium">Sloučení nelze provést</div>
            <div className="mt-0.5">{blockingError}</div>
          </div>
        </div>
      )}

      {preview && !blockingError && (
        <div className="space-y-4 relative">
          {previewLoading && (
            <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center pointer-events-none">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          )}
          <SectionTable title="Identita" rows={identityRows} />
          <SectionTable title="Statistiky" rows={statsRows} />
          <CoursesTable rows={coursesRows} />
          <SectionTable title="Počty záznamů" rows={countsRows} />
        </div>
      )}
    </div>
  );
}

function ConfirmStep({
  sourceUser,
  targetUser,
  confirmText,
  onChangeConfirm,
  submitError,
  isSubmitting,
}: {
  sourceUser: AdminUser;
  targetUser: AdminUser;
  confirmText: string;
  onChangeConfirm: (s: string) => void;
  submitError: string | null;
  isSubmitting: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-red-900">
          <div className="font-medium">Tato akce je nevratná.</div>
          <ul className="mt-2 list-disc pl-5 space-y-0.5 text-red-800">
            <li>
              Profil <strong>{sourceUser.name}</strong> (ID #{sourceUser.id})
              bude sloučen do <strong>{targetUser.name}</strong> (ID #
              {targetUser.id}).
            </li>
            <li>
              Zdrojový profil nebude moci přihlásit (e-mail bude uvolněn, PIN
              zůstane spálen).
            </li>
            <li>Veškerá data zdrojového profilu budou převedena na cílový.</li>
          </ul>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm">
        <div className="text-gray-600">
          Pro potvrzení napište přesně{" "}
          <span className="font-mono font-semibold text-gray-900 bg-white px-1.5 py-0.5 rounded border border-gray-300">
            {CONFIRM_PHRASE}
          </span>
          :
        </div>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => onChangeConfirm(e.target.value)}
          autoFocus
          disabled={isSubmitting}
          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100"
          placeholder={CONFIRM_PHRASE}
        />
        {confirmText && confirmText !== CONFIRM_PHRASE && (
          <div className="mt-1.5 text-xs text-red-600">
            Text se neshoduje – musí být přesně {CONFIRM_PHRASE} (rozlišuje
            velikost písmen).
          </div>
        )}
        {confirmText === CONFIRM_PHRASE && (
          <div className="mt-1.5 text-xs text-green-700 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Potvrzení v pořádku
          </div>
        )}
      </div>

      {submitError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{submitError}</span>
        </div>
      )}
    </div>
  );
}
