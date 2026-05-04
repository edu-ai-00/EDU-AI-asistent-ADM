"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import type {
  CourseProgressLesson,
  UserProgress,
} from "@/types/api";
import { formatDate, getStepAnswers } from "./shared";
import { LessonDetail } from "./LessonDetail";

export function ProgressTab({
  progress,
}: {
  progress: UserProgress[] | undefined;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (!progress || progress.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-4">
        Žádná data o postupu
      </p>
    );
  }

  // Group by course_id
  const byCourse = progress.reduce<Record<string, UserProgress[]>>(
    (acc, p) => {
      const key = p.course_id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-4">
      {Object.entries(byCourse).map(([courseId, lessons]) => {
        const completed = lessons.filter((l) => l.is_completed).length;
        const totalXp = lessons.reduce((sum, l) => {
          const lpLesson = l.progress_data as unknown as CourseProgressLesson | null;
          const sp = lpLesson?.step_progress;
          if (!sp) return sum;
          return (
            sum +
            Object.values(sp).reduce(
              (s, b) => s + (b.earnedXp ?? 0),
              0,
            )
          );
        }, 0);

        return (
          <div
            key={courseId}
            className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-gray-700">
                  {courseId}
                </span>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>
                    <span className="text-green-600 font-medium">
                      {completed}
                    </span>
                    /{lessons.length} lekcí
                  </span>
                  {totalXp > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-amber-600">
                      <Zap className="w-3 h-3" />
                      {totalXp} XP
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {lessons.map((lp) => {
                const isExpanded = expandedId === lp.id;
                const lpLesson =
                  lp.progress_data as unknown as CourseProgressLesson | null;
                const sp = lpLesson?.step_progress;
                const spEntries = sp ? Object.entries(sp) : [];
                const answeredCount = spEntries.filter(
                  ([, b]) => getStepAnswers(b) !== null,
                ).length;

                return (
                  <div key={lp.id}>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : lp.id)
                      }
                    >
                      <span className="text-gray-400">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <span className="text-xs font-medium text-gray-900 flex-1">
                        {lp.lesson_id}
                      </span>
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{
                                width: `${Math.min(lp.progress_percent, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-gray-600">
                            {lp.progress_percent}%
                          </span>
                        </div>
                        {lp.is_completed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        {answeredCount > 0 && (
                          <span className="text-blue-600">
                            {answeredCount} odpovědí
                          </span>
                        )}
                        <span className="text-gray-400">
                          {formatDate(lp.completed_at ?? lp.started_at)}
                        </span>
                      </div>
                    </button>
                    {isExpanded && lpLesson && (
                      <LessonDetail lesson={lpLesson} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
