"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Timer,
} from "lucide-react";
import type { QuizAttempt, QuizAttemptAnswer } from "@/types/api";
import { formatDate, formatSeconds, formatTime, scoreColor } from "./shared";

export function QuizzesTab({
  attempts,
}: {
  attempts: QuizAttempt[] | undefined;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (!attempts || attempts.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-4">
        Žádné pokusy o kvíz
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {attempts.map((attempt, idx) => {
        const key = attempt.id ?? idx;
        const isExpanded = expandedId === key;
        const rawAnswers = typeof attempt.answers === "string"
          ? (() => { try { return JSON.parse(attempt.answers); } catch { return []; } })()
          : attempt.answers;
        const answers: QuizAttemptAnswer[] = Array.isArray(rawAnswers) ? rawAnswers : [];

        return (
          <div key={key} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <button
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : key)}
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-400 flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </span>
                <span className="text-xs font-mono text-gray-700 flex-1 truncate">
                  {attempt.course_id ?? "-"}
                </span>
                <div className="flex items-center gap-4 text-xs flex-shrink-0">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full font-medium ${scoreColor(attempt.score_percent)}`}
                  >
                    {Math.round(attempt.score_percent)}%
                  </span>
                  <span className="text-gray-600">
                    {attempt.correct_answers}/{attempt.total_questions}
                  </span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <Timer className="w-3.5 h-3.5" />
                    {formatSeconds(attempt.time_spent_seconds)}
                  </span>
                  <span className="text-gray-400">
                    {formatDate(attempt.created_at)}
                  </span>
                </div>
              </div>
            </button>

            {isExpanded && answers.length > 0 && (
              <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] font-medium text-gray-400 uppercase">
                        <th className="pb-1.5 pr-3 w-8">#</th>
                        <th className="pb-1.5 pr-3">Otázka</th>
                        <th className="pb-1.5 pr-3 text-center">Odpověď</th>
                        <th className="pb-1.5 pr-3 text-center">Výsledek</th>
                        <th className="pb-1.5 text-center">Čas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {answers.map((a, aIdx) => (
                        <tr key={aIdx} className="border-t border-gray-100">
                          <td className="py-1.5 pr-3 text-gray-400">
                            {(a.question_index ?? aIdx) + 1}
                          </td>
                          <td className="py-1.5 pr-3 font-mono text-gray-600 max-w-[250px] truncate">
                            {a.question_id}
                          </td>
                          <td className="py-1.5 pr-3 text-center font-mono text-gray-500">
                            {a.selected_answer}
                          </td>
                          <td className="py-1.5 pr-3 text-center">
                            {a.is_correct ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[10px] font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                Správně
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-medium">
                                <XCircle className="w-3 h-3" />
                                Špatně
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 text-center text-gray-500 whitespace-nowrap">
                            {formatTime(a.answered_at)}
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
      })}
    </div>
  );
}
