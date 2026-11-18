"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, BellOff, ShieldAlert } from "lucide-react";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { useNotificationTypes } from "@/hooks/useNotifications";
import { NOTIFICATION_CATEGORY_ORDER, roleLabel } from "@/lib/notifications";
import { ActivePill, CategoryPill, ChannelsText, Pill, errorMessage, formatDateTime } from "./shared";

/**
 * Typy tab (NOTIF-9): every seeded notification type with its delivery
 * settings at a glance. Types are seeded and never created or deleted here —
 * a row opens the type's detail.
 */
export function NotificationTypesSection() {
  const router = useRouter();
  const { data: types, isLoading, error } = useNotificationTypes();

  const sorted = useMemo(() => {
    const order = (c: string) => {
      const i = NOTIFICATION_CATEGORY_ORDER.indexOf(c);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    return [...(types ?? [])].sort(
      (a, b) => order(a.category) - order(b.category) || a.name.localeCompare(b.name, "cs")
    );
  }, [types]);

  if (isLoading) return <LoadingPage message="Načítám typy notifikací…" />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <p className="text-gray-600">Typy notifikací se nepodařilo načíst</p>
        <p className="text-sm text-gray-400">{errorMessage(error, "Neznámá chyba")}</p>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <BellOff className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600">Zatím žádné typy notifikací</p>
        <p className="text-sm text-gray-400 mt-1">Typy založí seeder při nasazení API.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-3 py-3">Typ</th>
              <th className="px-3 py-3">Kategorie</th>
              <th className="px-3 py-3">Pro</th>
              <th className="px-3 py-3">Kanály</th>
              <th className="px-3 py-3">Povinná</th>
              <th className="px-3 py-3">Stav</th>
              <th className="px-3 py-3 text-right">Pravidla</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((type) => {
              const href = `/admin/notifications/types/${type.id}`;
              return (
                <tr
                  key={type.id}
                  onClick={() => router.push(href)}
                  className="border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 align-top"
                >
                  <td className="px-3 py-2.5 min-w-[220px]">
                    <Link
                      href={href}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-gray-900 hover:text-blue-700"
                    >
                      {type.name}
                    </Link>
                    <div className="font-mono text-[11px] text-gray-400">{type.key}</div>
                    {type.last_sent_at && (
                      <div className="text-[11px] text-gray-400">
                        Naposledy odesláno {formatDateTime(type.last_sent_at)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <CategoryPill category={type.category} />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{roleLabel(type.target_role)}</td>
                  <td className="px-3 py-2.5">
                    <ChannelsText channels={type.channels} />
                  </td>
                  <td className="px-3 py-2.5">
                    {type.is_mandatory ? (
                      <Pill className="bg-amber-50 text-amber-800" title="Obchází tiché hodiny, vypnutý push i frekvenční limit">
                        <ShieldAlert className="w-3 h-3" />
                        Povinná
                      </Pill>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <ActivePill active={type.is_active} />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                    {type.rules_count ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
