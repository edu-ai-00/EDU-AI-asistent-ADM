"use client";

import { useState } from "react";
import { useUserEloProfile, useUserEloInteractions } from "@/hooks/useElo";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { EloInteraction } from "@/types/api";
import { formatDate, scoreColor } from "./shared";

export function EloTab({ userId }: { userId: number }) {
  const { data: profile, isLoading: profileLoading } =
    useUserEloProfile(userId);
  const { data: interactions, isLoading: interactionsLoading } =
    useUserEloInteractions(userId);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'lesson' | 'quiz'>('all');

  const isLoading = profileLoading || interactionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
        <LoadingSpinner size="sm" />
        Načítání ELO dat…
      </div>
    );
  }

  const profileEloData = profile?.profil_elo;
  const latestSnapshotData = interactions?.[0]?.profil_elo_snapshot;
  const hasProfileData = profileEloData && profileEloData.some((v) => v !== 0);
  const displayElo = hasProfileData ? profileEloData : latestSnapshotData;
  const displayCounts = hasProfileData ? profile?.profil_pocet : null;
  const isFromSnapshot = !hasProfileData && !!latestSnapshotData;
  const snapshotDate = isFromSnapshot ? interactions?.[0]?.created_at : null;
  const hasInteractions = interactions && interactions.length > 0;

  if (!displayElo && !hasInteractions) {
    return (
      <p className="text-sm text-gray-400 italic py-4">
        Žádná ELO data pro tohoto uživatele
      </p>
    );
  }

  const filteredInteractions = interactions?.filter((i: EloInteraction) =>
    sourceFilter === 'all' ? true : i.source === sourceFilter,
  ) ?? [];

  const lessonCount = interactions?.filter((i: EloInteraction) => i.source === 'lesson').length ?? 0;
  const quizCount = interactions?.filter((i: EloInteraction) => i.source === 'quiz').length ?? 0;

  return (
    <div className="space-y-6">
      {/* ELO Profile */}
      {displayElo && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h5 className="text-xs font-semibold text-gray-500 uppercase">
              ELO Profil
            </h5>
            {isFromSnapshot && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                snapshot {formatDate(snapshotDate ?? null)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {displayElo.map((elo, idx) => {
              const count = displayCounts?.[idx] ?? null;
              if (!elo) return null; // skip empty dimensions
              return (
                <div
                  key={idx}
                  className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center min-w-[100px]"
                >
                  <p className="text-xs text-gray-400 mb-1">
                    Dimenze {idx + 1}
                  </p>
                  <p
                    className={`text-lg font-semibold ${
                      elo >= 7
                        ? "text-green-600"
                        : elo >= 5
                          ? "text-gray-900"
                          : "text-orange-600"
                    }`}
                  >
                    {typeof elo === 'number' && elo % 1 !== 0 ? elo.toFixed(1) : elo}
                  </p>
                  {count !== null && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {count} interakcí
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {!isFromSnapshot && profile?.updated_at && (
            <p className="text-xs text-gray-400 mt-2">
              Aktualizováno: {formatDate(profile.updated_at)}
            </p>
          )}
        </div>
      )}

      {/* ELO Interactions */}
      {hasInteractions && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h5 className="text-xs font-semibold text-gray-500 uppercase">
              Interakce ({filteredInteractions.length})
            </h5>
            <div className="flex gap-1">
              {(['all', 'lesson', 'quiz'] as const).map((f) => {
                const label = f === 'all' ? 'Vše' : f === 'lesson' ? `Lekce (${lessonCount})` : `Kvíz (${quizCount})`;
                return (
                  <button
                    key={f}
                    onClick={() => setSourceFilter(f)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                      sourceFilter === f
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-200">
                  <th className="pb-2 pr-4">Blok</th>
                  <th className="pb-2 pr-4">Kurz</th>
                  <th className="pb-2 pr-4 text-center">Zdroj</th>
                  <th className="pb-2 pr-4 text-center">Skóre</th>
                  <th className="pb-2 pr-4">Dimenze</th>
                  <th className="pb-2 pr-4">ELO snapshot</th>
                  <th className="pb-2">Datum</th>
                </tr>
              </thead>
              <tbody>
                {filteredInteractions.map((i: EloInteraction) => (
                  <tr key={i.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-mono text-xs text-gray-700 max-w-[180px] truncate">
                      {i.block_id}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-gray-500">
                      {i.course_id}
                    </td>
                    <td className="py-2 pr-4 text-center">
                      {i.source ? (
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          i.source === 'quiz'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-sky-100 text-sky-700'
                        }`}>
                          {i.source === 'quiz' ? 'Kvíz' : 'Lekce'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${scoreColor(i.score * 100)}`}
                      >
                        {Math.round(i.score * 100)}%
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs">
                      {i.updated_indices && i.updated_indices.length > 0 ? (
                        <div className="flex flex-wrap gap-0.5">
                          {i.updated_indices.map((idx) => (
                            <span
                              key={idx}
                              className="inline-flex px-1 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-mono font-medium"
                              title={`Dimenze ${idx + 1}`}
                            >
                              {idx + 1}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-300">–</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-500 max-w-[200px] truncate">
                      {i.profil_elo_snapshot
                        ? i.profil_elo_snapshot
                            .filter((v) => v !== null && v !== 0)
                            .map((v) => typeof v === 'number' && v % 1 !== 0 ? v.toFixed(1) : v)
                            .join(", ")
                        : "-"}
                    </td>
                    <td className="py-2 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(i.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
