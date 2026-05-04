"use client";

import type { LucideIcon } from "lucide-react";
import type {
  BlockStepProgress,
  CourseProgressData,
  StepAnswer,
} from "@/types/api";

// ── Helpers ──────────────────────────────────────────────────────────────────

export function formatSeconds(seconds: number | null): string {
  if (!seconds) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("cs-CZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(dateString: string | undefined): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDuration(
  openedAt: string | undefined,
  confirmedAt: string | undefined,
): string | null {
  if (!openedAt || !confirmedAt) return null;
  const ms = new Date(confirmedAt).getTime() - new Date(openedAt).getTime();
  if (ms < 0) return null;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-green-700 bg-green-50";
  if (score >= 60) return "text-yellow-700 bg-yellow-50";
  return "text-red-700 bg-red-50";
}

export function safeParseCourseProgress(
  raw: CourseProgressData | string | null | undefined,
): CourseProgressData | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return null;
      return parsed as CourseProgressData;
    } catch {
      return null;
    }
  }
  if (Array.isArray(raw)) return null;
  return raw;
}

export function getStepAnswers(
  sp: BlockStepProgress,
): Record<string, StepAnswer> | null {
  if (!sp.stepAnswers || Array.isArray(sp.stepAnswers)) return null;
  const entries = Object.entries(sp.stepAnswers);
  if (entries.length === 0) return null;
  return sp.stepAnswers as Record<string, StepAnswer>;
}

// ── Tab type ─────────────────────────────────────────────────────────────────

export type TabId = "courses" | "quizzes" | "progress" | "skills" | "elo" | "bookmarks";

// ── Small components ─────────────────────────────────────────────────────────

export function StatItem({
  label,
  value,
  suffix,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 min-w-0">
      <div className={`p-2 rounded-lg flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">
          {value}
          {suffix && <span className="text-[11px] font-normal text-gray-400 ml-1">{suffix}</span>}
        </p>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string | null }) {
  const colors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    downloaded: "bg-blue-100 text-blue-800",
  };
  const label = status ?? "unknown";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[label] ?? "bg-gray-100 text-gray-800"}`}
    >
      {label.replace("_", " ")}
    </span>
  );
}

export function TabButton({
  active,
  onClick,
  label,
  icon: Icon,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: LucideIcon;
  count?: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-state={active ? "active" : "inactive"}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      {count !== undefined && (
        <span
          className="ml-0.5 min-w-[1.25rem] rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums data-[state=active]:bg-gray-300"
          data-state={active ? "active" : "inactive"}
        >
          {count}
        </span>
      )}
    </button>
  );
}
