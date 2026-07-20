"use client";

import { CheckCircle2, XCircle, Clock, Zap } from "lucide-react";
import type { CourseProgressLesson } from "@/types/api";
import {
  formatDate,
  formatDuration,
  formatTime,
  getStepAnswers,
} from "./shared";

export function LessonDetail({ lesson }: { lesson: CourseProgressLesson }) {
  const completedBlocks = lesson.completed_blocks ?? [];
  const blockTimestamps = lesson.block_timestamps ?? {};
  const stepProgress = lesson.step_progress;
  const stepEntries = stepProgress ? Object.entries(stepProgress) : [];
  const hasTimestamps = Object.keys(blockTimestamps).length > 0;

  // hint/help/asistent opens as one row per occurrence, e.g. "MIWQZKLSL5-hint"
  // with its time, sorted chronologically (BR-BBK5FP).
  const hintHelpUsage = lesson.hint_help_usage ?? {};
  const eventKindLabel = { hint: "hint", help: "help", assistant: "asistent" } as const;
  const eventKindClass = {
    hint: "bg-blue-50 text-blue-700",
    help: "bg-orange-50 text-orange-700",
    assistant: "bg-purple-50 text-purple-700",
  } as const;
  const hintHelpRows = Object.entries(hintHelpUsage)
    .flatMap(([blockId, u]) =>
      (["hint", "help", "assistant"] as const).flatMap((kind) => {
        const events = u[`${kind}_events`];
        const first = u[`${kind}_first_ts`];
        // Prefer per-occurrence timestamps; fall back to first_ts for older
        // data synced before per-occurrence tracking existed.
        const times =
          events && events.length > 0 ? events : first ? [first] : [];
        return times.map((ts) => ({
          label: `${blockId}-${eventKindLabel[kind]}`,
          kind,
          ts,
        }));
      }),
    )
    .sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));

  const totalXp = stepEntries.reduce(
    (sum, [, sp]) => sum + (sp.earnedXp ?? 0),
    0,
  );
  const answeredBlocks = stepEntries.filter(
    ([, sp]) => getStepAnswers(sp) !== null,
  ).length;

  return (
    <div className="border-t border-gray-100 px-3 py-3 space-y-3">
      {/* Summary row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
        {lesson.completed_at && (
          <span className="text-gray-500">
            Dokončeno:{" "}
            <span className="text-gray-700">
              {formatDate(lesson.completed_at)}
            </span>
          </span>
        )}
        <span className="text-gray-500">
          Bloky:{" "}
          <span className="font-medium text-gray-700">
            {completedBlocks.length}
          </span>
        </span>
        {answeredBlocks > 0 && (
          <span className="text-gray-500">
            Odpovědí:{" "}
            <span className="font-medium text-blue-600">
              {answeredBlocks}
            </span>
          </span>
        )}
        {totalXp > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-700">
            <Zap className="w-3 h-3" />
            {totalXp} XP
          </span>
        )}
      </div>

      {/* Step progress table */}
      {stepEntries.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] font-medium text-gray-400 uppercase">
                <th className="pb-1.5 pr-3">Blok</th>
                <th className="pb-1.5 pr-3 text-center">Stav</th>
                <th className="pb-1.5 pr-3 text-center">Odpověď</th>
                <th className="pb-1.5 pr-3 text-center">XP</th>
                <th className="pb-1.5 pr-3 text-center">Skóre</th>
                {hasTimestamps && (
                  <>
                    <th className="pb-1.5 pr-3 text-center">Otevřeno</th>
                    <th className="pb-1.5 pr-3 text-center">Potvrzeno</th>
                    <th className="pb-1.5 text-center">Doba</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {stepEntries.map(([blockId, sp]) => {
                const answers = getStepAnswers(sp);
                const firstAnswer = answers
                  ? Object.values(answers)[0]
                  : null;

                return (
                  <tr key={blockId} className="border-t border-gray-100">
                    <td className="py-1.5 pr-3 font-mono text-gray-600 max-w-[200px] truncate">
                      {blockId}
                    </td>
                    <td className="py-1.5 pr-3 text-center">
                      {sp.isBlockCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 inline" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-gray-300 inline" />
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-center">
                      {firstAnswer ? (
                        firstAnswer.isCorrect ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[10px] font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Správně
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-medium">
                            <XCircle className="w-3 h-3" />
                            Špatně
                          </span>
                        )
                      ) : (
                        <span className="text-gray-300">–</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-center">
                      {sp.earnedXp > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-amber-700 font-medium">
                          <Zap className="w-3 h-3" />
                          {sp.earnedXp}
                        </span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-center">
                      {sp.bestScoreKoef !== undefined ? (
                        <span
                          className={`font-medium ${
                            sp.bestScoreKoef >= 1
                              ? "text-green-600"
                              : sp.bestScoreKoef > 0
                                ? "text-yellow-600"
                                : "text-gray-400"
                          }`}
                        >
                          {Math.round(sp.bestScoreKoef * 100)}%
                        </span>
                      ) : (
                        <span className="text-gray-300">–</span>
                      )}
                    </td>
                    {hasTimestamps && (() => {
                      const ts = blockTimestamps[blockId];
                      const dur = formatDuration(ts?.opened_at, ts?.confirmed_at);
                      return (
                        <>
                          <td className="py-1.5 pr-3 text-center text-gray-500 whitespace-nowrap">
                            {formatTime(ts?.opened_at)}
                          </td>
                          <td className="py-1.5 pr-3 text-center text-gray-500 whitespace-nowrap">
                            {formatTime(ts?.confirmed_at)}
                          </td>
                          <td className="py-1.5 text-center whitespace-nowrap">
                            {dur ? (
                              <span className="inline-flex items-center gap-0.5 text-blue-600 font-medium">
                                <Clock className="w-3 h-3" />
                                {dur}
                              </span>
                            ) : (
                              <span className="text-gray-300">–</span>
                            )}
                          </td>
                        </>
                      );
                    })()}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : completedBlocks.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1.5">
            Dokončené bloky ({completedBlocks.length})
          </p>
          {hasTimestamps ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] font-medium text-gray-400 uppercase">
                    <th className="pb-1.5 pr-3">Blok</th>
                    <th className="pb-1.5 pr-3 text-center">Otevřeno</th>
                    <th className="pb-1.5 pr-3 text-center">Potvrzeno</th>
                    <th className="pb-1.5 text-center">Doba</th>
                  </tr>
                </thead>
                <tbody>
                  {completedBlocks.map((blockId) => {
                    const ts = blockTimestamps[blockId];
                    const dur = formatDuration(ts?.opened_at, ts?.confirmed_at);
                    return (
                      <tr key={blockId} className="border-t border-gray-100">
                        <td className="py-1.5 pr-3 font-mono text-gray-600 max-w-[200px] truncate">
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            {blockId}
                          </span>
                        </td>
                        <td className="py-1.5 pr-3 text-center text-gray-500 whitespace-nowrap">
                          {formatTime(ts?.opened_at)}
                        </td>
                        <td className="py-1.5 pr-3 text-center text-gray-500 whitespace-nowrap">
                          {formatTime(ts?.confirmed_at)}
                        </td>
                        <td className="py-1.5 text-center whitespace-nowrap">
                          {dur ? (
                            <span className="inline-flex items-center gap-0.5 text-blue-600 font-medium">
                              <Clock className="w-3 h-3" />
                              {dur}
                            </span>
                          ) : (
                            <span className="text-gray-300">–</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {completedBlocks.map((blockId) => (
                <span
                  key={blockId}
                  className="inline-flex items-center gap-1 text-[10px] font-mono bg-green-50 text-green-700 px-1.5 py-0.5 rounded"
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {blockId}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Hint / help / assistant opens — one row per occurrence (BR-BBK5FP) */}
      {hintHelpRows.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1.5">
            Nápověda / Pomoc / Asistent ({hintHelpRows.length})
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-medium text-gray-400 uppercase">
                  <th className="pb-1.5 pr-3">Událost</th>
                  <th className="pb-1.5 text-center">Čas</th>
                </tr>
              </thead>
              <tbody>
                {hintHelpRows.map((r, i) => (
                  <tr key={`${r.label}-${i}`} className="border-t border-gray-100">
                    <td className="py-1.5 pr-3">
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded ${eventKindClass[r.kind]}`}
                      >
                        {r.label}
                      </span>
                    </td>
                    <td className="py-1.5 text-center text-gray-500 whitespace-nowrap">
                      {formatTime(r.ts)}
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
