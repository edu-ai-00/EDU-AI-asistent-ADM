"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useUserEloProfile } from "@/hooks/useElo";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// GPF dimension labels (35 subconstructs)
const GPF_DIM_LABELS: Record<number, { code: string; name: string }> = {
  0: { code: "N1.1", name: "Přirozená čísla – určí a počítá" },
  1: { code: "N1.2", name: "Přirozená čísla – ekvivalence" },
  2: { code: "N1.3", name: "Operace s přirozenými čísly" },
  3: { code: "N1.4", name: "Úlohy s přirozenými čísly" },
  4: { code: "N2.1", name: "Zlomky – určí a znázorní" },
  5: { code: "N2.2", name: "Operace se zlomky" },
  6: { code: "N2.3", name: "Úlohy se zlomky" },
  7: { code: "N3.1", name: "Desetinná čísla – určí a znázorní" },
  8: { code: "N3.2", name: "Desetinná čísla – ekvivalence" },
  9: { code: "N3.3", name: "Operace s desetinnými čísly" },
  10: { code: "N3.4", name: "Úlohy s desetinnými čísly" },
  11: { code: "N4.1", name: "Celá čísla – určí a znázorní" },
  12: { code: "N4.2", name: "Operace s celými čísly" },
  13: { code: "N4.3", name: "Úlohy s celými čísly" },
  14: { code: "N5.1", name: "Mocniny a odmocniny" },
  15: { code: "N5.2", name: "Operace s mocninami" },
  16: { code: "N6.1", name: "Operace napříč obory" },
  17: { code: "M1.1", name: "Jednotky měření" },
  18: { code: "M1.2", name: "Úlohy s rozměry" },
  19: { code: "M2.1", name: "Určení času" },
  20: { code: "M2.2", name: "Úlohy s časem" },
  21: { code: "M3.1", name: "Měna" },
  22: { code: "G1.1", name: "Vlastnosti útvarů" },
  23: { code: "G2.1", name: "Prostorové vizualizace" },
  24: { code: "G3.1", name: "Poloha a směr" },
  25: { code: "S1.1", name: "Práce s daty – čtení grafů" },
  26: { code: "S1.2", name: "Centrální tendence" },
  27: { code: "S2.1", name: "Pravděpodobnost" },
  28: { code: "S2.2", name: "Permutace a kombinace" },
  29: { code: "A1.1", name: "Pravidelnosti" },
  30: { code: "A2.1", name: "Výrazy" },
  31: { code: "A3.1", name: "Závislosti a poměry" },
  32: { code: "A3.2", name: "Rovnost" },
  33: { code: "A3.3", name: "Rovnice a nerovnice" },
  34: { code: "A3.4", name: "Funkce" },
};

const GPF_DOMAINS = [
  { code: "N", name: "Číslo a operace", indices: Array.from({ length: 17 }, (_, i) => i) },
  { code: "M", name: "Míry", indices: [17, 18, 19, 20, 21] },
  { code: "G", name: "Geometrie", indices: [22, 23, 24] },
  { code: "S", name: "Statistika a pravděpodobnost", indices: [25, 26, 27, 28] },
  { code: "A", name: "Algebra", indices: [29, 30, 31, 32, 33, 34] },
];

function computeDomainSkill(
  profilElo: number[] | null | undefined,
  profilPocet: number[] | null | undefined,
  indices: number[],
  c: number = 2.5,
) {
  if (!profilElo) return null;
  // Include any dimension that has a non-null, non-zero ELO value
  const eligible: { elo: number; count: number }[] = [];
  let totalWithData = 0;
  for (const i of indices) {
    const elo = profilElo[i];
    const count = profilPocet?.[i] ?? 0;
    if (elo != null && elo !== 0) {
      totalWithData++;
      eligible.push({ elo, count });
    }
  }
  if (eligible.length === 0) return null;

  const meanElo = eligible.reduce((s, e) => s + e.elo, 0) / eligible.length;
  const counts = eligible.map((e) => e.count).sort((a, b) => a - b);
  const medianCount = counts[Math.floor(counts.length / 2)];
  const totalTasks = eligible.reduce((s, e) => s + e.count, 0);

  // Confidence interval (guard against 0 count)
  const halfWidth = medianCount > 0 ? c / Math.sqrt(medianCount) : 0;

  let confidenceLabel: string;
  if (medianCount >= 30) confidenceLabel = "vyšší";
  else if (medianCount >= 20) confidenceLabel = "střední";
  else if (medianCount >= 5) confidenceLabel = "nižší";
  else confidenceLabel = "velmi nízká";

  // Per-dimension detail for expanded view
  const dimDetails = indices.map((i) => {
    const elo = profilElo[i];
    const count = profilPocet?.[i] ?? 0;
    const label = GPF_DIM_LABELS[i];
    return {
      index: i,
      code: label?.code || `D${i}`,
      name: label?.name || `Dimenze ${i + 1}`,
      elo: elo != null && elo !== 0 ? elo : null,
      count,
    };
  });

  return {
    level: meanElo,
    intervalLow: meanElo - halfWidth,
    intervalHigh: meanElo + halfWidth,
    confidenceLabel,
    includedCount: eligible.length,
    totalCount: indices.length,
    medianCount,
    totalTasks,
    dimDetails,
  };
}

export function SkillsTab({ userId }: { userId: number }) {
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  // Aggregated ELO profile (all courses, same as the app)
  const { data: eloProfile, isLoading } = useUserEloProfile(userId);

  const profilElo = eloProfile?.profil_elo;
  const profilPocet = eloProfile?.profil_pocet;

  // Compute domain-level skills from the raw ELO profile
  const domainSkills = GPF_DOMAINS.map((domain) => ({
    ...domain,
    skill: computeDomainSkill(profilElo, profilPocet, domain.indices),
  })).filter((d) => d.skill !== null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
        <LoadingSpinner size="sm" />
        Načítání dovedností…
      </div>
    );
  }

  if (!profilElo || domainSkills.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-4">
        Žádná data o dovednostech
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {domainSkills.map(({ code, name, skill }) => {
        if (!skill) return null;
        const level = skill.level;
        const isExpanded = expandedSkill === code;

        const levelColor =
          level <= 3 ? "text-red-600" :
          level <= 5 ? "text-orange-600" :
          level <= 7 ? "text-yellow-600" :
          "text-green-600";

        const barColor =
          level <= 3 ? "bg-red-400" :
          level <= 5 ? "bg-orange-400" :
          level <= 7 ? "bg-yellow-400" :
          "bg-green-400";

        const levelLabel =
          level <= 3 ? "Začátečník" :
          level <= 7 ? "Pokročilý" :
          "Expert";

        return (
          <div
            key={code}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            {/* Skill header — clickable */}
            <div
              className="px-4 py-3 cursor-pointer hover:bg-gray-50/50"
              onClick={() => setExpandedSkill(isExpanded ? null : code)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                  <span className="text-sm font-medium text-gray-700">{name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${levelColor}`}>
                    {level.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-400">{levelLabel}</span>
                </div>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full ${barColor}`}
                  style={{ width: `${Math.min(100, (level / 10) * 100)}%` }}
                />
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                <span>Interval: {skill.intervalLow.toFixed(1)} – {skill.intervalHigh.toFixed(1)}</span>
                <span>Jistota: {skill.confidenceLabel}</span>
                <span>{skill.includedCount}/{skill.totalCount} dimenzí</span>
                <span>Medián úloh: {skill.medianCount}</span>
              </div>
            </div>

            {/* Expanded: GPF dimension breakdown */}
            {isExpanded && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 space-y-4">
                {/* Summary row */}
                <div className="flex items-center gap-6 text-xs text-gray-500 pb-2 border-b border-gray-100">
                  <span>Výpočet: průměr z <strong className="text-gray-700">{skill.includedCount}</strong>/{skill.totalCount} dimenzí s daty</span>
                  <span>Celkem úloh: <strong className="text-gray-700">{skill.totalTasks}</strong></span>
                  <span>Jistota: <strong className="text-gray-700">{skill.confidenceLabel}</strong></span>
                </div>

                {/* Dimension list */}
                <div className="space-y-1">
                  {skill.dimDetails.map((dim) => {
                    const hasValue = dim.elo !== null;

                    return (
                      <div
                        key={dim.index}
                        className={`flex items-center gap-2 text-xs ${!hasValue ? "opacity-40" : ""}`}
                      >
                        <span className="w-10 font-mono text-blue-600 shrink-0">{dim.code}</span>
                        <span className="flex-1 text-gray-600 truncate" title={dim.name}>{dim.name}</span>
                        {hasValue ? (
                          <>
                            <div className="w-24 bg-gray-200 rounded-full h-1.5 shrink-0">
                              <div
                                className={`h-1.5 rounded-full ${
                                  dim.elo! <= 3 ? "bg-red-400" :
                                  dim.elo! <= 5 ? "bg-orange-400" :
                                  dim.elo! <= 7 ? "bg-yellow-400" :
                                  "bg-green-400"
                                }`}
                                style={{ width: `${Math.min(100, (dim.elo! / 10) * 100)}%` }}
                              />
                            </div>
                            <span className="w-8 text-right font-mono font-medium text-gray-700">
                              {dim.elo!.toFixed(1)}
                            </span>
                            <span className="w-14 text-right text-gray-400">
                              {dim.count} úl.
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="w-24 shrink-0" />
                            <span className="w-8 text-right text-gray-300 italic">—</span>
                            <span className="w-14 text-right text-gray-300">0 úl.</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Result line */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs">
                  <span className="text-gray-500">
                    Výsledná úroveň = průměr zahrnutých dimenzí ± {((skill.intervalHigh - skill.intervalLow) / 2).toFixed(1)}
                  </span>
                  <span className={`text-base font-bold ${levelColor}`}>
                    {level.toFixed(1)}
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      ({skill.intervalLow.toFixed(1)}–{skill.intervalHigh.toFixed(1)})
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
