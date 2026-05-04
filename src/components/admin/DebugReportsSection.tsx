"use client";

import { useState } from "react";
import {
  ArrowLeft,
  AlertCircle,
  Bug,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { useDebugReports, useDebugReport } from "@/hooks/useDebugReports";
import type {
  DebugReportListItem,
  DebugReportData,
} from "@/types/debug-report";

// ---------------------------------------------------------------------------
// Platform badge
// ---------------------------------------------------------------------------

const PLATFORM_CONFIG: Record<string, { bg: string; text: string }> = {
  android: { bg: "bg-green-100", text: "text-green-700" },
  ios: { bg: "bg-blue-100", text: "text-blue-700" },
  web: { bg: "bg-purple-100", text: "text-purple-700" },
};

function PlatformBadge({ platform }: { platform: string }) {
  const cfg = PLATFORM_CONFIG[platform.toLowerCase()] ?? {
    bg: "bg-gray-100",
    text: "text-gray-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      {platform}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Collapsible section card
// ---------------------------------------------------------------------------

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
        {title}
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-gray-100">{children}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Key-value row (reused across sections)
// ---------------------------------------------------------------------------

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null) return null;
  return (
    <div className="flex items-baseline gap-3 py-1">
      <span className="text-xs font-medium text-gray-500 w-36 shrink-0">
        {label}
      </span>
      <span className="text-sm text-gray-900 break-all">
        {typeof value === "boolean" ? (value ? "Ano" : "Ne") : String(value)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function AppSection({ data }: { data: NonNullable<DebugReportData["app"]> }) {
  return (
    <div>
      <KV label="Version" value={data.version} />
      <KV label="Build number" value={data.build_number} />
    </div>
  );
}

function DeviceSection({
  data,
}: {
  data: NonNullable<DebugReportData["device"]>;
}) {
  return (
    <div>
      <KV label="Platform" value={data.platform} />
      <KV label="Is web" value={data.is_web} />
    </div>
  );
}

function AuthSection({
  data,
}: {
  data: NonNullable<DebugReportData["auth"]>;
}) {
  return (
    <div>
      <KV label="Authenticated" value={data.is_authenticated} />
      <KV label="Has token" value={data.has_token} />
    </div>
  );
}

function UserSection({
  data,
}: {
  data: NonNullable<DebugReportData["user"]>;
}) {
  return (
    <div>
      <KV label="ID" value={data.id} />
      <KV label="Email" value={data.email} />
      <KV label="Name" value={data.name} />
      <KV label="Is guest" value={data.is_guest} />
    </div>
  );
}

function StatsSection({
  data,
}: {
  data: NonNullable<DebugReportData["user_stats"]>;
}) {
  return (
    <div>
      <KV label="Level" value={data.level} />
      <KV label="XP" value={data.xp} />
      <KV label="Streak" value={data.streak} />
      <KV label="Achievements" value={data.achievements} />
      {Object.entries(data)
        .filter(([k]) => !["level", "xp", "streak", "achievements"].includes(k))
        .map(([k, v]) => (
          <KV key={k} label={k} value={String(v)} />
        ))}
    </div>
  );
}

function ConnectivitySection({ data }: { data: string }) {
  return <KV label="Status" value={data} />;
}

function DatabaseSection({
  data,
}: {
  data: NonNullable<DebugReportData["database"]>;
}) {
  return (
    <div>
      <KV label="Courses count" value={data.courses_count} />
      <KV label="User courses count" value={data.user_courses_count} />
      {data.courses && (
        <div className="mt-2">
          <p className="text-xs font-medium text-gray-500 mb-1">
            Courses table ({data.courses.length})
          </p>
          <pre className="text-xs bg-gray-50 rounded p-2 overflow-x-auto max-h-48">
            {JSON.stringify(data.courses, null, 2)}
          </pre>
        </div>
      )}
      {data.user_courses && (
        <div className="mt-2">
          <p className="text-xs font-medium text-gray-500 mb-1">
            User courses table ({data.user_courses.length})
          </p>
          <pre className="text-xs bg-gray-50 rounded p-2 overflow-x-auto max-h-48">
            {JSON.stringify(data.user_courses, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function SyncSection({
  data,
}: {
  data: NonNullable<DebugReportData["sync"]>;
}) {
  return (
    <div>
      <KV label="State" value={data.state} />
      <KV label="Last sync" value={data.last_sync} />
      <KV label="Next sync" value={data.next_sync} />
      <KV label="Pending count" value={data.pending_count} />
      {data.queue && data.queue.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-gray-500 mb-1">Queue</p>
          <pre className="text-xs bg-gray-50 rounded p-2 overflow-x-auto max-h-48">
            {JSON.stringify(data.queue, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function EloSection({
  data,
}: {
  data: NonNullable<DebugReportData["elo"]>;
}) {
  const elo = data.profil_elo ?? [];
  const pocet = data.profil_pocet ?? [];
  const len = Math.max(elo.length, pocet.length);

  if (len === 0) return <p className="text-sm text-gray-500">Žádná data</p>;

  return (
    <div className="overflow-x-auto">
      <table className="text-xs w-full">
        <thead>
          <tr className="text-gray-500">
            <th className="pr-3 py-1 text-left font-medium">Index</th>
            {Array.from({ length: len }, (_, i) => (
              <th key={i} className="px-2 py-1 text-center font-medium">
                {i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="pr-3 py-1 font-medium text-gray-500">ELO</td>
            {Array.from({ length: len }, (_, i) => (
              <td key={i} className="px-2 py-1 text-center text-gray-900">
                {elo[i] ?? "–"}
              </td>
            ))}
          </tr>
          <tr>
            <td className="pr-3 py-1 font-medium text-gray-500">Počet</td>
            {Array.from({ length: len }, (_, i) => (
              <td key={i} className="px-2 py-1 text-center text-gray-900">
                {pocet[i] ?? "–"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report detail view
// ---------------------------------------------------------------------------

function ReportDetail({
  reportId,
  onBack,
}: {
  reportId: number;
  onBack: () => void;
}) {
  const { data: report, isLoading, error } = useDebugReport(reportId);

  if (isLoading) return <LoadingPage message="Načítání reportu..." />;

  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-600">Nepodařilo se načíst report</p>
        <button
          onClick={onBack}
          className="text-sm text-blue-600 hover:underline"
        >
          Zpět na seznam
        </button>
      </div>
    );
  }

  const rd = report.report_data;

  // Collect known section keys so we can show leftover as raw JSON
  const KNOWN_KEYS = new Set([
    "app",
    "device",
    "auth",
    "user",
    "user_stats",
    "connectivity",
    "database",
    "sync",
    "elo",
  ]);
  const extraKeys = Object.keys(rd).filter((k) => !KNOWN_KEYS.has(k));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Debug report #{report.id}
          </h2>
          <p className="text-sm text-gray-500">
            {report.user?.name ?? "Neznámý uživatel"} &middot; {report.user?.email ?? ""}
          </p>
        </div>
      </div>

      {/* Metadata card */}
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 mb-6">
        <div className="flex items-center gap-4 px-4 py-3">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider w-28 shrink-0">
            Platforma
          </span>
          <PlatformBadge platform={report.platform} />
        </div>
        <div className="flex items-center gap-4 px-4 py-3">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider w-28 shrink-0">
            Verze
          </span>
          <span className="text-sm text-gray-900">{report.app_version}</span>
        </div>
        <div className="flex items-center gap-4 px-4 py-3">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider w-28 shrink-0">
            Zařízení
          </span>
          <span className="text-sm text-gray-900">
            {report.device_model} &middot; {report.os_version}
          </span>
        </div>
        <div className="flex items-center gap-4 px-4 py-3">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider w-28 shrink-0">
            Datum
          </span>
          <span className="text-sm text-gray-900">
            {new Date(report.created_at).toLocaleString("cs-CZ", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* Structured sections */}
      <div className="space-y-3">
        {rd.app && (
          <CollapsibleSection title="App" defaultOpen>
            <AppSection data={rd.app} />
          </CollapsibleSection>
        )}
        {rd.device && (
          <CollapsibleSection title="Device">
            <DeviceSection data={rd.device} />
          </CollapsibleSection>
        )}
        {rd.auth && (
          <CollapsibleSection title="Auth">
            <AuthSection data={rd.auth} />
          </CollapsibleSection>
        )}
        {rd.user && (
          <CollapsibleSection title="User">
            <UserSection data={rd.user} />
          </CollapsibleSection>
        )}
        {rd.user_stats && (
          <CollapsibleSection title="Stats">
            <StatsSection data={rd.user_stats} />
          </CollapsibleSection>
        )}
        {rd.connectivity !== undefined && (
          <CollapsibleSection title="Connectivity">
            <ConnectivitySection data={String(rd.connectivity)} />
          </CollapsibleSection>
        )}
        {rd.database && (
          <CollapsibleSection title="Database">
            <DatabaseSection data={rd.database} />
          </CollapsibleSection>
        )}
        {rd.sync && (
          <CollapsibleSection title="Sync">
            <SyncSection data={rd.sync} />
          </CollapsibleSection>
        )}
        {rd.elo && (
          <CollapsibleSection title="ELO">
            <EloSection data={rd.elo} />
          </CollapsibleSection>
        )}

        {/* Raw JSON for unexpected extra keys */}
        {extraKeys.length > 0 && (
          <CollapsibleSection title="Ostatní data">
            <pre className="text-xs bg-gray-50 rounded p-2 overflow-x-auto max-h-64">
              {JSON.stringify(
                Object.fromEntries(extraKeys.map((k) => [k, rd[k]])),
                null,
                2
              )}
            </pre>
          </CollapsibleSection>
        )}

        {/* Full raw JSON fallback */}
        <CollapsibleSection title="Raw JSON">
          <pre className="text-xs bg-gray-50 rounded p-2 overflow-x-auto max-h-96">
            {JSON.stringify(rd, null, 2)}
          </pre>
        </CollapsibleSection>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report list view
// ---------------------------------------------------------------------------

function ReportList({
  items,
  onSelect,
}: {
  items: DebugReportListItem[];
  onSelect: (id: number) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <Bug className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600">Žádné debug reporty</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <th className="px-4 py-3">Uživatel</th>
            <th className="px-4 py-3">Platforma</th>
            <th className="px-4 py-3">Verze</th>
            <th className="px-4 py-3">Zařízení</th>
            <th className="px-4 py-3">Datum</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onSelect(item.id)}
              className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-2.5">
                <div className="text-sm text-gray-900">{item.user?.name ?? "—"}</div>
                <div className="text-xs text-gray-500">{item.user?.email ?? ""}</div>
              </td>
              <td className="px-4 py-2.5">
                <PlatformBadge platform={item.platform} />
              </td>
              <td className="px-4 py-2.5 text-sm text-gray-600 font-mono">
                {item.app_version}
              </td>
              <td className="px-4 py-2.5 text-sm text-gray-600">
                {item.device_model}
              </td>
              <td className="px-4 py-2.5 text-sm text-gray-500 whitespace-nowrap">
                {new Date(item.created_at).toLocaleDateString("cs-CZ", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DebugReportsSection (exported orchestrator)
// ---------------------------------------------------------------------------

export function DebugReportsSection() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [userFilter, setUserFilter] = useState("");

  // Debounce user_id filter
  const [debouncedUserId, setDebouncedUserId] = useState<number | undefined>();
  const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null);

  function handleUserFilterChange(value: string) {
    setUserFilter(value);
    if (debounceRef[0]) clearTimeout(debounceRef[0]);
    const parsed = parseInt(value, 10);
    debounceRef[0] = setTimeout(
      () => setDebouncedUserId(isNaN(parsed) ? undefined : parsed),
      400
    );
  }

  const { data, isLoading, error } = useDebugReports(debouncedUserId);

  if (selectedId !== null) {
    return (
      <ReportDetail reportId={selectedId} onBack={() => setSelectedId(null)} />
    );
  }

  if (isLoading) {
    return <LoadingPage message="Načítání debug reportů..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-600">Nepodařilo se načíst debug reporty</p>
      </div>
    );
  }

  const items = data?.data ?? [];
  const total = data?.meta?.total;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Filtrovat dle user ID..."
          value={userFilter}
          onChange={(e) => handleUserFilterChange(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
        />
        {total !== undefined && (
          <p className="text-sm text-gray-500">Celkem: {total} reportů</p>
        )}
      </div>
      <ReportList items={items} onSelect={setSelectedId} />
    </div>
  );
}
