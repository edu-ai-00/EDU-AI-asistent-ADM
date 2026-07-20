"use client";

import { AlertTriangle, Award, Zap } from "lucide-react";
import type { AdminAchievement } from "@/types/api";
import { getAchievementMeta, CATEGORY_LABEL } from "@/lib/achievements";
import { formatDate } from "./shared";

const CATEGORY_COLOR: Record<string, string> = {
  trophy: "bg-amber-50 text-amber-700",
  goal: "bg-blue-50 text-blue-700",
  challenge: "bg-purple-50 text-purple-700",
};

export function AchievementsTab({
  achievements,
  achievementsCount,
}: {
  achievements: AdminAchievement[];
  achievementsCount: number;
}) {
  const list = [...achievements].sort(
    (a, b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime(),
  );

  const totalXp = list.reduce((sum, a) => sum + getAchievementMeta(a.id).xpReward, 0);
  // achievements_count is a client-maintained counter on user_stats; the list
  // is the real row count in user_achievements. Flag when they disagree.
  const drift = achievementsCount !== list.length;

  if (list.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        Žádné získané úspěchy
        {drift && (
          <span className="block mt-1 text-amber-600">
            (čítač uvádí {achievementsCount})
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drift && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            Nesoulad: čítač <b>achievements_count = {achievementsCount}</b>, ale
            v databázi je <b>{list.length}</b> záznamů.
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Award className="w-4 h-4 text-purple-500" />
        <span>{list.length} úspěchů</span>
        <span className="text-gray-300">·</span>
        <Zap className="w-4 h-4 text-blue-500" />
        <span>~{totalXp} XP z odměn</span>
      </div>

      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {list.map((a) => {
          const meta = getAchievementMeta(a.id);
          const known = meta.label !== a.id;
          return (
            <div key={a.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="text-xl flex-shrink-0" aria-hidden>
                {meta.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {meta.label}
                  </span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${CATEGORY_COLOR[meta.category] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {CATEGORY_LABEL[meta.category]}
                  </span>
                  {!known && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600">
                      neznámé ID
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 font-mono truncate">{a.id}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-xs font-semibold text-blue-600">+{meta.xpReward} XP</div>
                <div className="text-[11px] text-gray-400">{formatDate(a.earned_at)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
