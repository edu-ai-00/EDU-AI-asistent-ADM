"use client";

import { Clock, Monitor, Smartphone, Tablet, type LucideIcon } from "lucide-react";
import { useUserWorkTime } from "@/hooks/useWorkTime";
import { deviceLabel, recentEntries } from "@/lib/session-device";
import { formatDuration } from "@/lib/work-time";
import type { RegistrationDevice, WorkSessionDevice } from "@/types/api";

/** Today's calendar date in the reporting timezone (Europe/Prague). */
function pragueToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" }).format(new Date());
}

function sumRange(byDay: Record<string, number>, days: number): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const cutoffStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" }).format(cutoff);
  return Object.entries(byDay)
    .filter(([day]) => day >= cutoffStr)
    .reduce((acc, [, secs]) => acc + secs, 0);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}

export const DEVICE_TYPE_ICONS: Record<string, LucideIcon> = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
};

/** The device a session was recorded on: an icon plus e.g. "Android · mobil" (BR-Y2TJ74). */
function DeviceTag({ device }: { device: WorkSessionDevice }) {
  const label = deviceLabel(device);
  if (!label) return null;
  const Icon = device.type ? DEVICE_TYPE_ICONS[device.type] : undefined;

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-gray-500">
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {label}
    </span>
  );
}

function formatStart(iso: string): string {
  return new Date(iso).toLocaleString("cs-CZ", {
    timeZone: "Europe/Prague",
    dateStyle: "short",
    timeStyle: "short",
  });
}

/**
 * `registration` is the account's first sign-in to the app (BR-CMA88Y). It is
 * listed among the sessions without any work time, so a pupil who signed up
 * and did nothing else still shows when and on which device they did.
 */
export function WorkTimeTab({
  userId,
  registration,
}: {
  userId: number;
  registration?: RegistrationDevice | null;
}) {
  const { data, isLoading, error } = useUserWorkTime(userId);

  if (isLoading) {
    return <div className="py-6 text-sm text-gray-500">Načítám čas práce…</div>;
  }
  if (error) {
    return <div className="py-6 text-sm text-red-500">Nepodařilo se načíst čas práce.</div>;
  }

  const hasWorkTime = !!data && data.total_seconds > 0;
  const noWorkTime = (
    <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
      <Clock className="h-4 w-4" />
      Zatím žádný zaznamenaný čas práce.
    </div>
  );
  if (!data || (!hasWorkTime && !registration)) {
    return noWorkTime;
  }

  const today = data.by_day[pragueToday()] ?? 0;
  const byCourse = Object.entries(data.by_course).sort((a, b) => b[1] - a[1]);
  const recent = recentEntries(hasWorkTime ? data.sessions : [], registration);

  return (
    <div className="space-y-5">
      {hasWorkTime ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Dnes" value={formatDuration(today)} />
          <Stat label="7 dní" value={formatDuration(sumRange(data.by_day, 7))} />
          <Stat label="30 dní" value={formatDuration(sumRange(data.by_day, 30))} />
          <Stat label="Celkem" value={formatDuration(data.total_seconds)} />
        </div>
      ) : (
        noWorkTime
      )}

      {byCourse.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-700">Podle kurzu</h3>
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {byCourse.map(([courseId, secs]) => (
              <div key={courseId} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="truncate text-gray-700">{courseId}</span>
                <span className="font-medium text-gray-900">{formatDuration(secs)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-700">Poslední relace</h3>
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {recent.map((entry) => {
              if (entry.kind === "registration") {
                const r = entry.registration;
                return (
                  <div key="registration" className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-gray-700">{formatStart(r.at)}</span>
                      <span className="text-gray-500">Registrace</span>
                      <DeviceTag device={r} />
                    </span>
                    <span className="shrink-0 text-gray-400">—</span>
                  </div>
                );
              }
              const s = entry.session;
              return (
                <div key={`${s.course_id}-${s.start}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-gray-700">{formatStart(s.start)}</span>
                    {(s.devices ?? []).map((d) => (
                      <DeviceTag key={`${d.platform}-${d.type}`} device={d} />
                    ))}
                  </span>
                  <span className="shrink-0 font-medium text-gray-900">{formatDuration(s.duration)}</span>
                </div>
              );
            })}
          </div>
          {recent.some((e) => e.kind === "session" && !e.session.devices?.length) && (
            <p className="mt-2 text-xs text-gray-500">
              U starších relací zařízení chybí — aplikace ho zaznamenává až od nové verze.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
