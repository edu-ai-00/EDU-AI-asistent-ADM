"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Megaphone, Plus } from "lucide-react";
import { LoadingPage, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useNotificationBroadcasts, useNotificationTypes } from "@/hooks/useNotifications";
import { broadcastProgress, pluralCs } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { BroadcastStatusPill, ProgressBar, errorMessage, formatDateTime } from "./shared";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Vše" },
  { value: "draft", label: "Koncepty" },
  { value: "sent", label: "Odeslané" },
  { value: "archived", label: "Archivované" },
];

/**
 * Rozesílky tab (NOTIF-10): manual broadcasts — drafts, sent and archived.
 * The list keeps polling while any broadcast in it is still sending.
 */
export function NotificationBroadcastsSection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawStatus = searchParams.get("status") ?? "";
  const status = STATUS_FILTERS.some((f) => f.value === rawStatus) ? rawStatus : "";

  const { data: broadcasts, isLoading, isFetching, error } = useNotificationBroadcasts(status);
  const { data: types } = useNotificationTypes();
  const typeNames = useMemo(() => new Map((types ?? []).map((t) => [t.key, t.name])), [types]);

  const setStatus = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("status", value);
      else params.delete("status");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5" role="tablist" aria-label="Stav rozesílky">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value || "all"}
              type="button"
              role="tab"
              aria-selected={status === f.value}
              onClick={() => setStatus(f.value)}
              className={cn(
                "px-3 py-1 text-sm rounded-md transition-colors",
                status === f.value ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {isFetching && <LoadingSpinner size="sm" />}
        <div className="flex-1" />
        <Link
          href="/admin/notifications/broadcasts/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nová rozesílka
        </Link>
      </div>

      {isLoading && !broadcasts ? (
        <LoadingPage message="Načítám rozesílky…" />
      ) : error && !broadcasts ? (
        <div className="flex flex-col items-center justify-center min-h-[240px] gap-3 text-center">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <p className="text-gray-600">Rozesílky se nepodařilo načíst</p>
          <p className="text-sm text-gray-400">{errorMessage(error, "Neznámá chyba")}</p>
        </div>
      ) : !broadcasts || broadcasts.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">{status ? "Žádné rozesílky v tomto stavu" : "Zatím žádné rozesílky"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Rozesílka</th>
                  <th className="px-3 py-3">Typ</th>
                  <th className="px-3 py-3">Stav</th>
                  <th className="px-3 py-3 text-right">Příjemci</th>
                  <th className="px-3 py-3">Průběh</th>
                  <th className="px-3 py-3">Odesláno</th>
                </tr>
              </thead>
              <tbody>
                {broadcasts.map((b) => {
                  const href = `/admin/notifications/broadcasts/${b.id}`;
                  const progress = broadcastProgress(b);
                  const started = b.status !== "draft" && !(b.status === "archived" && !b.sent_at);
                  return (
                    <tr
                      key={b.id}
                      onClick={() => router.push(href)}
                      className="border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 align-top"
                    >
                      <td className="px-3 py-2.5 min-w-[200px] max-w-[280px]">
                        <Link
                          href={href}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-gray-900 hover:text-blue-700 line-clamp-2"
                        >
                          {b.title || <span className="italic text-gray-400">bez titulku</span>}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 min-w-[140px]">{typeNames.get(b.type_key) ?? b.type_key}</td>
                      <td className="px-3 py-2.5">
                        <BroadcastStatusPill status={b.status} />
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                        {started ? b.recipient_count : "—"}
                      </td>
                      <td className="px-3 py-2.5 min-w-[140px]">
                        {started ? (
                          <div className="space-y-1">
                            <ProgressBar value={progress.percent} tone={b.failed_count > 0 ? "red" : progress.percent === 100 ? "green" : "blue"} />
                            <div className="text-[11px] text-gray-500 tabular-nums">
                              {progress.processed}/{progress.total} · doručeno {b.delivered_count} · přečteno {b.read_count ?? 0}
                              {b.failed_count > 0 && <span className="text-red-600"> · {b.failed_count} {pluralCs(b.failed_count, "chyba", "chyby", "chyb")}</span>}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600 tabular-nums">
                        {formatDateTime(b.sent_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
