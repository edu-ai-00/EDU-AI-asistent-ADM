"use client";

// Small building blocks shared by the notification admin screens (BR-QK6WW3).
// No toast or form library in this app: errors and confirmations are inline
// banners, inputs are native elements styled like AuditLogSection's filters.

import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowLeft, CheckCircle2, Info, Lock, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { auditActionLabel } from "@/lib/audit-log";
import {
  BROADCAST_STATUS_LABELS,
  categoryLabel,
  channelsLabel,
  flattenValidationErrors,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import type { AuditLogEntry } from "@/types/audit-log";
import type { PathError } from "@/types/notifications";

export const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500";

export const monoTextareaClass =
  "w-full px-3 py-2 text-xs leading-5 font-mono border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500";

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Message of any thrown value, Czech fallback. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/** The 422 body of an ApiError, or undefined. */
export function errorPayload(err: unknown): Record<string, unknown> | undefined {
  return err instanceof ApiError ? err.payload : undefined;
}

/** Banner lines for an error: the message plus every field message not rendered elsewhere. */
export function errorLines(err: unknown, fallback: string, exclude: string[] = []): string[] {
  const lines = flattenValidationErrors(errorPayload(err), exclude);
  const message = errorMessage(err, fallback);
  return lines.includes(message) ? lines : [message, ...lines];
}

// ── Layout ───────────────────────────────────────────────────────────────────

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1 text-xs font-medium text-gray-600 min-w-0", className)}>
      {label}
      {children}
      {hint && <span className="font-normal text-gray-400">{hint}</span>}
      {error && <span className="font-normal text-red-600">{error}</span>}
    </label>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("bg-white rounded-lg border border-gray-200", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 border-b border-gray-100">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </section>
  );
}

export function CheckboxRow({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-2 text-sm",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 rounded border-gray-300"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0">
        <span className="text-gray-900">{label}</span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
    </label>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3"
    >
      <ArrowLeft className="w-4 h-4" />
      {children}
    </Link>
  );
}

export function AdminOnlyNotice({ children = "Notifikace spravují jen administrátoři." }: { children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
      <Lock className="w-10 h-10 text-gray-300" />
      <p className="text-gray-600">{children}</p>
    </div>
  );
}

// ── Banners ──────────────────────────────────────────────────────────────────

const BANNER_TONES = {
  error: { box: "border-red-200 bg-red-50 text-red-800", icon: AlertCircle, close: "text-red-400 hover:text-red-600" },
  success: {
    box: "border-green-200 bg-green-50 text-green-800",
    icon: CheckCircle2,
    close: "text-green-500 hover:text-green-700",
  },
  warning: {
    box: "border-amber-200 bg-amber-50 text-amber-900",
    icon: AlertTriangle,
    close: "text-amber-500 hover:text-amber-700",
  },
  info: { box: "border-blue-200 bg-blue-50 text-blue-900", icon: Info, close: "text-blue-400 hover:text-blue-600" },
} as const;

export function Banner({
  tone,
  title,
  lines,
  children,
  onClose,
  className,
}: {
  tone: keyof typeof BANNER_TONES;
  title?: React.ReactNode;
  /** Rendered as a list when there is more than one. */
  lines?: string[];
  children?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  const t = BANNER_TONES[tone];
  const Icon = t.icon;
  const list = lines?.filter(Boolean) ?? [];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm", t.box, className)}
    >
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-1">
        {title && <div className="font-medium">{title}</div>}
        {list.length === 1 && <div>{list[0]}</div>}
        {list.length > 1 && (
          <ul className="list-disc pl-4 space-y-0.5">
            {list.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
        {children}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Zavřít" className={t.close}>
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/** `{path, message}` problems of a rule definition. */
export function PathErrorList({ errors }: { errors: PathError[] }) {
  if (errors.length === 0) return null;
  return (
    <ul className="space-y-1 text-sm">
      {errors.map((e, i) => (
        <li key={i} className="flex items-start gap-2">
          <code className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs text-red-800">
            {e.path || "$"}
          </code>
          <span className="text-red-800">
            {e.message}
            {e.line !== undefined && (
              <span className="text-red-600">
                {" "}
                (řádek {e.line}
                {e.column !== undefined ? `, sloupec ${e.column}` : ""})
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Pills ────────────────────────────────────────────────────────────────────

export function Pill({
  className,
  children,
  title,
}: {
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
        className ?? "bg-gray-100 text-gray-700"
      )}
    >
      {children}
    </span>
  );
}

const CATEGORY_PILL: Record<string, string> = {
  provoz: "bg-slate-100 text-slate-700",
  navyk: "bg-teal-50 text-teal-700",
  pokrok: "bg-green-50 text-green-700",
  aktivace: "bg-orange-50 text-orange-700",
};

export function CategoryPill({ category }: { category: string }) {
  return <Pill className={CATEGORY_PILL[category]}>{categoryLabel(category)}</Pill>;
}

export function ActivePill({ active }: { active: boolean }) {
  return active ? (
    <Pill className="bg-green-50 text-green-700">Aktivní</Pill>
  ) : (
    <Pill className="bg-gray-100 text-gray-500">Vypnuto</Pill>
  );
}

export function ChannelsText({ channels }: { channels: string[] | null | undefined }) {
  return <span className="whitespace-nowrap text-gray-700">{channelsLabel(channels)}</span>;
}

const BROADCAST_PILL: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sending: "bg-blue-100 text-blue-700",
  sent: "bg-green-50 text-green-700",
  failed: "bg-red-100 text-red-700",
  archived: "bg-gray-100 text-gray-400",
};

export function BroadcastStatusPill({ status }: { status: string }) {
  return (
    <Pill className={BROADCAST_PILL[status]}>
      {status === "sending" && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
      {BROADCAST_STATUS_LABELS[status] ?? status}
    </Pill>
  );
}

export function ProgressBar({ value, tone = "blue" }: { value: number; tone?: "blue" | "green" | "red" }) {
  const color = tone === "green" ? "bg-green-500" : tone === "red" ? "bg-red-500" : "bg-blue-500";
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
    </div>
  );
}

// ── Audit history ────────────────────────────────────────────────────────────

function shortValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 79)}…` : text;
}

/** Audit entries of one type or rule, newest first, each with its field diff. */
export function AuditHistoryList({
  entries,
  isLoading,
  error,
}: {
  entries: AuditLogEntry[] | undefined;
  isLoading: boolean;
  error: unknown;
}) {
  if (isLoading) return <p className="text-sm text-gray-400">Načítám historii změn…</p>;
  if (error) return <p className="text-sm text-red-600">{errorMessage(error, "Historii se nepodařilo načíst.")}</p>;
  if (!entries || entries.length === 0) return <p className="text-sm text-gray-400">Zatím beze změn.</p>;
  return (
    <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
      {entries.map((entry) => {
        const diff = entry.diff ? Object.entries(entry.diff) : [];
        const actor = entry.actor?.name || entry.actor?.email || (entry.actor_id ? `#${entry.actor_id}` : "systém / API klíč");
        return (
          <li key={entry.id} className="px-3 py-2 text-sm">
            <details>
              <summary className="cursor-pointer list-none flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
                  {formatDateTime(entry.created_at)}
                </span>
                <span className="text-gray-900">{auditActionLabel(entry.action)}</span>
                <span className="text-xs text-gray-500">{actor}</span>
                {diff.length > 0 && (
                  <span className="text-xs text-gray-400 truncate">
                    {diff.map(([field]) => field).join(", ")}
                  </span>
                )}
              </summary>
              {diff.length > 0 ? (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-gray-100">
                      {diff.map(([field, change]) => {
                        const fromTo =
                          change && typeof change === "object" && ("from" in change || "to" in change);
                        return (
                          <tr key={field} className="align-top">
                            <td className="py-1 pr-3 font-mono text-gray-600 whitespace-nowrap">{field}</td>
                            {fromTo ? (
                              <>
                                <td className="py-1 pr-3 text-red-800 break-all">{shortValue(change.from)}</td>
                                <td className="py-1 text-green-800 break-all">{shortValue(change.to)}</td>
                              </>
                            ) : (
                              <td className="py-1 text-gray-700 break-all" colSpan={2}>
                                {shortValue(change)}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-1 text-xs text-gray-400">Bez zaznamenaných změn polí.</p>
              )}
            </details>
          </li>
        );
      })}
    </ul>
  );
}
