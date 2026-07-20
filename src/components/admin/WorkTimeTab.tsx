"use client";

import { Clock } from "lucide-react";
import { useUserWorkTime } from "@/hooks/useWorkTime";

/** Format a duration in seconds as a compact "1 h 23 min" / "45 min" / "30 s". */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
}

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

export function WorkTimeTab({ userId }: { userId: number }) {
  const { data, isLoading, error } = useUserWorkTime(userId);

  if (isLoading) {
    return <div className="py-6 text-sm text-gray-500">Načítám čas práce…</div>;
  }
  if (error) {
    return <div className="py-6 text-sm text-red-500">Nepodařilo se načíst čas práce.</div>;
  }
  if (!data || data.total_seconds === 0) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
        <Clock className="h-4 w-4" />
        Zatím žádný zaznamenaný čas práce.
      </div>
    );
  }

  const today = data.by_day[pragueToday()] ?? 0;
  const byCourse = Object.entries(data.by_course).sort((a, b) => b[1] - a[1]);
  const recentSessions = data.sessions.slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Dnes" value={formatDuration(today)} />
        <Stat label="7 dní" value={formatDuration(sumRange(data.by_day, 7))} />
        <Stat label="30 dní" value={formatDuration(sumRange(data.by_day, 30))} />
        <Stat label="Celkem" value={formatDuration(data.total_seconds)} />
      </div>

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

      {recentSessions.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-700">Poslední relace</h3>
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {recentSessions.map((s) => (
              <div key={`${s.course_id}-${s.start}`} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-gray-700">
                  {new Date(s.start).toLocaleString("cs-CZ", {
                    timeZone: "Europe/Prague",
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
                <span className="font-medium text-gray-900">{formatDuration(s.duration)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
