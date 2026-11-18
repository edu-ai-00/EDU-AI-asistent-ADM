"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { NotificationTypesSection } from "@/components/admin/notifications/NotificationTypesSection";
import { NotificationRulesSection } from "@/components/admin/notifications/NotificationRulesSection";
import { NotificationBroadcastsSection } from "@/components/admin/notifications/NotificationBroadcastsSection";
import { DashboardBannersSection } from "@/components/admin/notifications/DashboardBannersSection";
import { NotificationHistorySection } from "@/components/admin/notifications/NotificationHistorySection";
import { AdminOnlyNotice } from "@/components/admin/notifications/shared";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "types", label: "Typy", desc: "Druhy notifikací, jejich texty a pravidla doručení" },
  { key: "rules", label: "Pravidla", desc: "Která událost v aplikaci pošle jakou notifikaci" },
  { key: "broadcasts", label: "Rozesílky", desc: "Ruční zprávy pro vybrané školy, třídy a role" },
  { key: "dashboard", label: "Dashboard", desc: "Bannery na přehledu podle XP, kurzu, třídy a školy" },
  { key: "history", label: "Historie", desc: "Co komu odešlo, kdy a jak to dopadlo" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const tabHref = (key: TabKey) => (key === "types" ? "/admin/notifications" : `/admin/notifications?tab=${key}`);

// One nav item („Notifikace“ under Správa) leads here; unlike /admin/users the
// tabs are on the page itself, as links so each tab has its own URL. Every
// section reads filters from the URL, hence the Suspense boundary.
function NotificationsPageContent() {
  const { isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab");
  const tab: TabKey = TABS.some((t) => t.key === raw) ? (raw as TabKey) : "types";
  const current = TABS.find((t) => t.key === tab)!;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifikace</h1>
        <p className="text-gray-600 mt-1">{current.desc}</p>
      </div>

      {!isAdmin ? (
        <AdminOnlyNotice />
      ) : (
        <>
          <nav className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto" aria-label="Sekce notifikací">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={tabHref(t.key)}
                aria-current={t.key === tab ? "page" : undefined}
                className={cn(
                  "px-3 py-2 -mb-px border-b-2 text-sm font-medium whitespace-nowrap transition-colors",
                  t.key === tab
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                )}
              >
                {t.label}
              </Link>
            ))}
          </nav>

          {tab === "types" && <NotificationTypesSection />}
          {tab === "rules" && <NotificationRulesSection />}
          {tab === "broadcasts" && <NotificationBroadcastsSection />}
          {tab === "dashboard" && <DashboardBannersSection />}
          {tab === "history" && <NotificationHistorySection />}
        </>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense>
      <NotificationsPageContent />
    </Suspense>
  );
}
