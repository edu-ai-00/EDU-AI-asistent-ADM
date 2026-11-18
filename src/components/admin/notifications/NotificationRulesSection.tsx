"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Lock, Plus, Workflow, X } from "lucide-react";
import { LoadingPage, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useNotificationMeta, useNotificationRules, useNotificationTypes } from "@/hooks/useNotifications";
import { EMPTY_RULE_FILTERS, RULE_FILTER_KEYS, pluralCs, readFilters } from "@/lib/notifications";
import type { NotificationRule, NotificationRuleFilters, NotificationType } from "@/types/notifications";
import { ActivePill, Field, Pill, errorMessage, inputClass } from "./shared";

/** Type of a rule, from the eager-loaded relation or the type list. */
export function ruleTypeOf(
  rule: NotificationRule,
  types: NotificationType[] | undefined
): { key: string; name: string } | null {
  if (rule.type) return { key: rule.type.key, name: rule.type.name };
  const byId = types?.find((t) => t.id === rule.notification_type_id);
  if (byId) return { key: byId.key, name: byId.name };
  const key = rule.definition?.then?.type;
  if (!key) return null;
  const byKey = types?.find((t) => t.key === key);
  return { key, name: byKey?.name ?? key };
}

/**
 * Pravidla tab (NOTIF-7/9): which domain event sends which type. Filters live
 * in the URL next to `?tab=rules` so a filtered list survives a reload.
 */
export function NotificationRulesSection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchKey = searchParams.toString();
  const filters = useMemo(
    () => readFilters<NotificationRuleFilters>(new URLSearchParams(searchKey), RULE_FILTER_KEYS, EMPTY_RULE_FILTERS),
    [searchKey]
  );

  const { data: rules, isLoading, isFetching, error } = useNotificationRules(filters);
  const { data: types } = useNotificationTypes();
  const { data: meta } = useNotificationMeta();

  const eventLabels = useMemo(() => new Map((meta?.events ?? []).map((e) => [e.key, e.label])), [meta]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const hasFilters = RULE_FILTER_KEYS.some((k) => filters[k] !== "");

  const eventOptions = useMemo(() => {
    const keys = new Set((meta?.events ?? []).map((e) => e.key));
    const options = (meta?.events ?? []).map((e) => ({ value: e.key, label: e.label }));
    if (filters.event && !keys.has(filters.event)) options.push({ value: filters.event, label: filters.event });
    return options;
  }, [meta, filters.event]);

  const typeOptions = useMemo(() => {
    const options = [...(types ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name, "cs"))
      .map((t) => ({ value: t.key, label: t.name }));
    if (filters.type && !options.some((o) => o.value === filters.type)) {
      options.push({ value: filters.type, label: filters.type });
    }
    return options;
  }, [types, filters.type]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Událost">
          <select className={inputClass} value={filters.event} onChange={(e) => updateParams({ event: e.target.value })}>
            <option value="">Všechny události</option>
            {eventOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Typ notifikace">
          <select className={inputClass} value={filters.type} onChange={(e) => updateParams({ type: e.target.value })}>
            <option value="">Všechny typy</option>
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Stav">
          <select className={inputClass} value={filters.active} onChange={(e) => updateParams({ active: e.target.value })}>
            <option value="">Vše</option>
            <option value="1">Aktivní</option>
            <option value="0">Vypnutá</option>
          </select>
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500 tabular-nums">
          {rules ? `${rules.length} ${pluralCs(rules.length, "pravidlo", "pravidla", "pravidel")}` : ""}
        </span>
        {isFetching && <LoadingSpinner size="sm" />}
        {hasFilters && (
          <button
            onClick={() => updateParams({ event: null, type: null, active: null })}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <X className="w-3.5 h-3.5" />
            Zrušit filtry
          </button>
        )}
        <div className="flex-1" />
        <Link
          href="/admin/notifications/rules/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nové pravidlo
        </Link>
      </div>

      {isLoading && !rules ? (
        <LoadingPage message="Načítám pravidla…" />
      ) : error && !rules ? (
        <div className="flex flex-col items-center justify-center min-h-[240px] gap-3 text-center">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <p className="text-gray-600">Pravidla se nepodařilo načíst</p>
          <p className="text-sm text-gray-400">{errorMessage(error, "Neznámá chyba")}</p>
        </div>
      ) : !rules || rules.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <Workflow className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">{hasFilters ? "Žádné pravidlo neodpovídá filtrům" : "Zatím žádná pravidla"}</p>
        </div>
      ) : (
        <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${isFetching ? "opacity-60" : ""}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Pravidlo</th>
                  <th className="px-3 py-3">Událost</th>
                  <th className="px-3 py-3">Typ</th>
                  <th className="px-3 py-3">Stav</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => {
                  const href = `/admin/notifications/rules/${rule.id}`;
                  const type = ruleTypeOf(rule, types);
                  const eventKey = rule.event_key || rule.definition?.when?.event;
                  return (
                    <tr
                      key={rule.id}
                      onClick={() => router.push(href)}
                      className="border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 align-top"
                    >
                      <td className="px-3 py-2.5 min-w-[200px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={href}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-gray-900 hover:text-blue-700"
                          >
                            {rule.name}
                          </Link>
                          {rule.is_system && (
                            <Pill className="bg-purple-50 text-purple-700" title="Systémové pravidlo nelze smazat; událost a typ jsou zamčené">
                              <Lock className="w-3 h-3" />
                              Systémové
                            </Pill>
                          )}
                        </div>
                        {rule.description && (
                          <div className="text-xs text-gray-500 line-clamp-2">{rule.description}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-gray-900">{(eventKey && eventLabels.get(eventKey)) || eventKey || "—"}</div>
                        {eventKey && <div className="font-mono text-[11px] text-gray-400">{eventKey}</div>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-gray-900">{type?.name ?? "—"}</div>
                        {type && <div className="font-mono text-[11px] text-gray-400">{type.key}</div>}
                      </td>
                      <td className="px-3 py-2.5">
                        <ActivePill active={rule.is_active} />
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
