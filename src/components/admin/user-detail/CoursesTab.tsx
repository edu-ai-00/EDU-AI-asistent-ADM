"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  BookOpen,
  Timer,
  ListChecks,
  Brain,
} from "lucide-react";
import type {
  CourseProgressLesson,
  QuizAttempt,
  UserCourseInfo,
  UserProgress,
} from "@/types/api";
import {
  formatDate,
  formatSeconds,
  formatTime,
  getStepAnswers,
  safeParseCourseProgress,
  StatusBadge,
} from "./shared";
import { LessonDetail } from "./LessonDetail";

function CourseCard({
  course,
  isExpanded,
  onToggle,
  lessonProgress,
  onSwitchToQuizzes,
  quizAttempts,
}: {
  course: UserCourseInfo;
  isExpanded: boolean;
  onToggle: () => void;
  lessonProgress?: UserProgress[];
  onSwitchToQuizzes?: () => void;
  quizAttempts?: QuizAttempt[];
}) {
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);

  const progressData = safeParseCourseProgress(course.progress_data);
  const lessons = progressData?.lessons;
  const lessonEntries = lessons ? Object.entries(lessons) : [];
  const hasQuizResults = progressData?.quiz_score != null;

  // Fallback: check quiz_attempts table when progress_data lacks quiz info
  const courseQuizAttempts = quizAttempts?.filter(a => a.course_id === course.course_id) ?? [];
  const latestAttempt = courseQuizAttempts.length > 0 ? courseQuizAttempts[0] : null; // already sorted desc
  const hasQuizAttempts = latestAttempt != null;

  const hasData =
    lessonEntries.length > 0 || (lessonProgress?.length ?? 0) > 0 || hasQuizResults || hasQuizAttempts;
  const xpEarned = progressData?.xp_earned;

  // Quiz-only courses: either flagged via only_quiz, or inferred from 0 lessons + quiz results
  const isQuizOnly = course.only_quiz || ((course.total_lessons === 0 || (course.total_lessons == null && lessonEntries.length === 0)) && (hasQuizResults || hasQuizAttempts));
  const quizCompleted = progressData?.quiz_completed === true || (isQuizOnly && hasQuizAttempts && latestAttempt?.completed_at != null);

  // Derive effective status: quiz-only courses that finished their quiz are "completed"
  const effectiveStatus = isQuizOnly && (quizCompleted || course.status === "completed")
    ? "completed"
    : isQuizOnly && (hasQuizResults || hasQuizAttempts)
      ? "in_progress"
      : course.status;

  // Derive effective progress: for quiz-only, completed = 100%, otherwise use quiz score
  const effectiveQuizScore = progressData?.quiz_score ?? latestAttempt?.score_percent ?? 0;
  const progress = isQuizOnly
    ? (quizCompleted || course.status === "completed" ? 100 : (hasQuizResults || hasQuizAttempts) ? Math.round(effectiveQuizScore) : 0)
    : Math.min(course.progress_percent ?? 0, 100);

  const totalAnswered = lessonEntries.reduce((sum, [, lesson]) => {
    const sp = lesson.step_progress;
    if (!sp) return sum;
    return (
      sum +
      Object.values(sp).filter((b) => getStepAnswers(b) !== null).length
    );
  }, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <button
        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start gap-3">
          <span className="text-gray-400 flex-shrink-0 mt-0.5">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
              <span className="font-medium text-gray-900 truncate">
                {course.course_name ?? "Neznámý kurz"}
              </span>
              <StatusBadge status={effectiveStatus} />
              <div className="flex items-center gap-3 text-xs text-gray-500 ml-auto">
                {!isQuizOnly && (
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    {course.completed_lessons ?? 0}/{course.total_lessons ?? "-"}
                  </span>
                )}
                {!isQuizOnly && totalAnswered > 0 && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <ListChecks className="w-3.5 h-3.5" />
                    {totalAnswered}
                  </span>
                )}
                {(hasQuizResults || hasQuizAttempts) && (
                  <span className="flex items-center gap-1 text-purple-600">
                    <Brain className="w-3.5 h-3.5" />
                    {progressData?.quiz_correct ?? latestAttempt?.correct_answers ?? 0}/{progressData?.quiz_total ?? latestAttempt?.total_questions ?? 0} ({Math.round(effectiveQuizScore)}%)
                  </span>
                )}
                {xpEarned != null && xpEarned > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Zap className="w-3.5 h-3.5" />
                    {xpEarned}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5" />
                  {formatSeconds(course.time_spent_seconds)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600 w-10 text-right">
                {progress}%
              </span>
            </div>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 mb-3">
            <span>
              ID:{" "}
              <span className="font-mono text-gray-600">
                {course.course_id}
              </span>
            </span>
            {course.downloaded_at && (
              <span>Staženo: {formatDate(course.downloaded_at)}</span>
            )}
            {course.started_at && (
              <span>Zahájeno: {formatDate(course.started_at)}</span>
            )}
            {course.completed_at && (
              <span>Dokončeno: {formatDate(course.completed_at)}</span>
            )}
            {xpEarned != null && xpEarned > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <Zap className="w-3 h-3" />
                {xpEarned} XP celkem
              </span>
            )}
          </div>

          {/* Quiz results card */}
          {(hasQuizResults || hasQuizAttempts) && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-purple-700 uppercase">Výsledky kvízu</span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-xs text-gray-500">Skóre</span>
                  <p className={`font-semibold ${
                    effectiveQuizScore >= 80 ? 'text-green-600'
                    : effectiveQuizScore >= 60 ? 'text-yellow-600'
                    : 'text-red-600'
                  }`}>
                    {Math.round(effectiveQuizScore)}%
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Správně</span>
                  <p className="font-semibold text-gray-900">
                    {progressData?.quiz_correct ?? latestAttempt?.correct_answers ?? 0}/{progressData?.quiz_total ?? latestAttempt?.total_questions ?? 0}
                  </p>
                </div>
                {(progressData?.quiz_completed_at || latestAttempt?.completed_at) && (
                  <div>
                    <span className="text-xs text-gray-500">Dokončeno</span>
                    <p className="text-xs text-gray-700">
                      {formatDate(progressData?.quiz_completed_at ?? latestAttempt?.completed_at ?? '')}
                    </p>
                  </div>
                )}
              </div>
              {/* Per-block quiz answers with timestamps */}
              {progressData?.quiz_answers && Object.keys(progressData.quiz_answers).length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] font-medium text-gray-400 uppercase">
                        <th className="pb-1.5 pr-3">Blok</th>
                        <th className="pb-1.5 pr-3 text-center">Odpověď</th>
                        <th className="pb-1.5 text-center">Čas odpovědi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(progressData?.quiz_answers ?? {}).map(([blockId, qa]) => (
                        <tr key={blockId} className="border-t border-purple-100">
                          <td className="py-1.5 pr-3 font-mono text-gray-600 max-w-[200px] truncate">
                            {blockId}
                          </td>
                          <td className="py-1.5 pr-3 text-center">
                            {qa.is_answered ? (
                              qa.is_correct ? (
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
                          <td className="py-1.5 text-center text-gray-500 whitespace-nowrap">
                            {formatTime(qa.answered_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!hasData ? (
            isQuizOnly ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Brain className="w-3.5 h-3.5 text-purple-500" />
                <span>Tento kurz obsahuje pouze kvíz — data najdete v záložce</span>
                {onSwitchToQuizzes && (
                  <button
                    onClick={onSwitchToQuizzes}
                    className="text-purple-600 hover:text-purple-800 font-medium underline underline-offset-2"
                  >
                    Kvízy
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Žádná data o postupu pro tento kurz
              </p>
            )
          ) : (
            <div className="space-y-2">
              {lessonEntries.map(([lessonId, lesson]) => {
                const isLessonExpanded = expandedLesson === lessonId;
                const sp = lesson.step_progress;
                const spEntries = sp ? Object.values(sp) : [];
                const lessonXp = spEntries.reduce(
                  (s, b) => s + (b.earnedXp ?? 0),
                  0,
                );
                const lessonAnswered = spEntries.filter(
                  (b) => getStepAnswers(b) !== null,
                ).length;
                const lessonCorrect = spEntries.filter((b) => {
                  const a = getStepAnswers(b);
                  if (!a) return false;
                  return Object.values(a).some((v) => v.isCorrect);
                }).length;

                return (
                  <div
                    key={lessonId}
                    className="bg-white rounded border border-gray-200"
                  >
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                      onClick={() =>
                        setExpandedLesson(
                          isLessonExpanded ? null : lessonId,
                        )
                      }
                    >
                      <span className="text-gray-400">
                        {isLessonExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <span className="text-xs font-medium text-gray-900 flex-1">
                        {lessonId}
                      </span>
                      <div className="flex items-center gap-3 text-xs">
                        {lesson.is_completed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        <span className="text-gray-400">
                          {(() => {
                            const completed = (lesson.completed_blocks ?? []).length;
                            const total = Math.max(
                              completed,
                              spEntries.length,
                              Object.keys(lesson.block_timestamps ?? {}).length,
                            );
                            return completed === total
                              ? `${completed} bloků`
                              : `${completed}/${total} bloků`;
                          })()}
                        </span>
                        {lessonAnswered > 0 && (
                          <span className="text-blue-600">
                            {lessonCorrect}/{lessonAnswered} správně
                          </span>
                        )}
                        {lessonXp > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-amber-600">
                            <Zap className="w-3 h-3" />
                            {lessonXp}
                          </span>
                        )}
                      </div>
                    </button>
                    {isLessonExpanded && <LessonDetail lesson={lesson} />}
                  </div>
                );
              })}

              {lessonEntries.length === 0 &&
                lessonProgress?.map((lp) => {
                  const lpLesson =
                    lp.progress_data as unknown as CourseProgressLesson | null;
                  const sp = lpLesson?.step_progress;
                  const spEntries = sp ? Object.values(sp) : [];
                  const lpXp = spEntries.reduce(
                    (s, b) => s + (b.earnedXp ?? 0),
                    0,
                  );
                  const isLessonExpanded = expandedLesson === lp.lesson_id;

                  return (
                    <div
                      key={lp.id}
                      className="bg-white rounded border border-gray-200"
                    >
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                        onClick={() =>
                          setExpandedLesson(
                            isLessonExpanded ? null : lp.lesson_id,
                          )
                        }
                      >
                        <span className="text-gray-400">
                          {isLessonExpanded ? (
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
                          {lpXp > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-amber-600">
                              <Zap className="w-3 h-3" />
                              {lpXp}
                            </span>
                          )}
                        </div>
                      </button>
                      {isLessonExpanded && lpLesson && (
                        <LessonDetail lesson={lpLesson} />
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CoursesTab({
  courses,
  progress,
  onSwitchToQuizzes,
  quizAttempts,
}: {
  courses: UserCourseInfo[];
  progress?: UserProgress[];
  onSwitchToQuizzes?: () => void;
  quizAttempts?: QuizAttempt[];
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (courses.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic py-4">
        Žádné zapsané kurzy
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {courses.map((course) => {
        const courseProgress = progress?.filter(
          (p) => p.course_id === course.course_id,
        );
        return (
          <CourseCard
            key={course.id}
            course={course}
            isExpanded={expandedId === course.id}
            onToggle={() =>
              setExpandedId(expandedId === course.id ? null : course.id)
            }
            lessonProgress={courseProgress}
            onSwitchToQuizzes={onSwitchToQuizzes}
            quizAttempts={quizAttempts}
          />
        );
      })}
    </div>
  );
}
