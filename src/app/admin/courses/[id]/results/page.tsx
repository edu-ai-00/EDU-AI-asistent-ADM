"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Eye,
  HelpCircle,
  Code,
  Users,
  BarChart3,
  Heart,
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
} from "lucide-react";
import { useCourse, useCourseData } from "@/hooks/useCourses";
import { useCourseProgress, useCourseProgressStats } from "@/hooks/useProgress";
import { useQuizAttempts } from "@/hooks/useQuizAttempts";
import { LoadingPage, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { BlockV2, LessonV2 } from "@/types/block-v2";
import type { BlockStats, QuizAttempt, QuizAttemptAnswer, QuizAttemptsResponse, UserProgress } from "@/types/api";

// ============================================================================
// Helpers
// ============================================================================

function parseAnswers(answers: QuizAttemptAnswer[] | string): QuizAttemptAnswer[] {
  if (typeof answers === "string") {
    try { return JSON.parse(answers); } catch { return []; }
  }
  return answers;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/[#*_`~>[\]()!]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

function formatSeconds(seconds: number | null | undefined): string {
  if (!seconds) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function correctRate(stats: BlockStats): number {
  const total = stats.correct_count + stats.incorrect_count;
  if (total === 0) return -1; // no data
  return Math.round((stats.correct_count / total) * 100);
}

function rateColor(rate: number): string {
  if (rate < 0) return "bg-gray-200";
  if (rate >= 80) return "bg-green-500";
  if (rate >= 60) return "bg-yellow-500";
  if (rate >= 40) return "bg-orange-500";
  return "bg-red-500";
}

function rateTextColor(rate: number): string {
  if (rate < 0) return "text-gray-400";
  if (rate >= 80) return "text-green-700";
  if (rate >= 60) return "text-yellow-700";
  if (rate >= 40) return "text-orange-700";
  return "text-red-700";
}

// ============================================================================
// Block Type Badge (shared)
// ============================================================================

function BlockTypeBadge({ block }: { block: BlockV2 }) {
  if (block.type === "display") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        <Eye className="w-3 h-3" />
        Zobrazení
      </span>
    );
  }
  if (block.type === "exercise") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <Dumbbell className="w-3 h-3" />
        Procvičování
      </span>
    );
  }
  const questionConfig =
    block.steps?.find((s) => s.type === "question")?.question ?? block.question;
  const qType = questionConfig?.type ?? "unknown";
  const labels: Record<string, string> = {
    multiple_choice: "Výběr z možností",
    true_false: "Pravda / Nepravda",
    open: "Otevřená",
    numeric: "Číselná",
  };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      <HelpCircle className="w-3 h-3" />
      {labels[qType] ?? qType}
    </span>
  );
}

// ============================================================================
// Question Detail (shared)
// ============================================================================

function QuestionDetail({ block }: { block: BlockV2 }) {
  if (block.type !== "question" && block.type !== "exercise") return null;
  const q =
    block.steps?.find((s) => s.type === "question")?.question ?? block.question;
  if (!q) return null;

  if (q.type === "open") {
    return (
      <div className="mt-2 text-xs text-gray-500">
        Očekávaná odpověď:{" "}
        <span className="font-mono bg-gray-100 px-1 rounded">
          {q.correct_answer ?? "—"}
        </span>
      </div>
    );
  }

  if (!q.options?.length) return null;

  return (
    <div className="mt-2 space-y-1">
      {q.options.map((opt) => (
        <div
          key={opt.id}
          className={`text-xs flex items-start gap-1.5 ${
            opt.is_correct ? "text-green-700" : "text-gray-500"
          }`}
        >
          <span
            className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex-shrink-0 flex items-center justify-center ${
              opt.is_correct
                ? "border-green-500 bg-green-50"
                : "border-gray-300"
            }`}
          >
            {opt.is_correct && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            )}
          </span>
          {opt.text}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Stats Bar — shows block-level stats inline
// ============================================================================

function StatsBar({ stats }: { stats: BlockStats }) {
  const rate = correctRate(stats);
  return (
    <div className="flex items-center gap-3 text-xs flex-shrink-0">
      <span className="text-gray-500" title="Celkem pokusů">
        {stats.total_attempts} pokusů
      </span>
      {rate >= 0 && (
        <div className="flex items-center gap-1.5" title={`Správnost ${rate}%`}>
          <div className="w-16 bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${rateColor(rate)}`}
              style={{ width: `${rate}%` }}
            />
          </div>
          <span className={`font-medium ${rateTextColor(rate)}`}>{rate}%</span>
        </div>
      )}
      {stats.liked_count > 0 && (
        <span className="text-pink-500 flex items-center gap-0.5">
          <Heart className="w-3 h-3" />
          {stats.liked_count}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Block Detail View — per-user answers for a specific block
// ============================================================================

function BlockDetailView({
  block,
  progress,
}: {
  block: BlockV2;
  progress: UserProgress[] | undefined;
}) {
  if (!progress?.length) {
    return (
      <p className="text-xs text-gray-400 italic px-4 py-2">
        Žádná data od uživatelů
      </p>
    );
  }

  // Collect answers for this block
  const answers: {
    userName: string;
    userId: number;
    answer?: string;
    isCorrect?: boolean;
    isLiked?: boolean;
  }[] = [];
  for (const p of progress) {
    const blockData = p.progress_data?.blocks?.[block.block_id];
    if (!blockData) continue;
    const feedback = p.progress_data?.block_feedback?.[block.block_id];
    answers.push({
      userName: p.user?.name ?? `User #${p.id}`,
      userId: p.user?.id ?? 0,
      answer: blockData.answer,
      isCorrect: blockData.isCorrect,
      isLiked: feedback?.isLiked,
    });
  }

  if (answers.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic px-4 py-2">
        Žádné odpovědi pro tento blok
      </p>
    );
  }

  // Answer distribution for MC questions
  const q =
    block.steps?.find((s) => s.type === "question")?.question ?? block.question;
  const showDistribution =
    q?.options?.length && (block.type === "question" || block.type === "exercise");

  return (
    <div className="px-4 pb-3 space-y-3">
      {/* Answer distribution */}
      {showDistribution && q?.options && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-600">
            Rozložení odpovědí ({answers.length} odpovědí)
          </p>
          {q.options.map((opt) => {
            const count = answers.filter(
              (a) => a.answer === opt.id || a.answer === opt.text
            ).length;
            const pct =
              answers.length > 0 ? Math.round((count / answers.length) * 100) : 0;
            return (
              <div key={opt.id} className="flex items-center gap-2 text-xs">
                <span
                  className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 flex items-center justify-center ${
                    opt.is_correct
                      ? "border-green-500 bg-green-50"
                      : "border-gray-300"
                  }`}
                >
                  {opt.is_correct && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  )}
                </span>
                <span className="w-32 truncate text-gray-700">{opt.text}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      opt.is_correct ? "bg-green-500" : "bg-gray-400"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-gray-500 w-14 text-right">
                  {count} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Individual answers table */}
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-200">
            <th className="pb-1.5 pr-3">Uživatel</th>
            <th className="pb-1.5 pr-3">Odpověď</th>
            <th className="pb-1.5 pr-3 text-center">Správně</th>
            <th className="pb-1.5 text-center">Líbí se</th>
          </tr>
        </thead>
        <tbody>
          {answers.map((a, idx) => (
            <tr key={idx} className="border-b border-gray-50">
              <td className="py-1.5 pr-3">
                <Link
                  href={`/admin/users/${a.userId}`}
                  className="text-blue-600 hover:underline"
                >
                  {a.userName}
                </Link>
              </td>
              <td className="py-1.5 pr-3 font-mono text-gray-700 max-w-xs truncate">
                {a.answer ?? "-"}
              </td>
              <td className="py-1.5 pr-3 text-center">
                {a.isCorrect === true && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 inline" />
                )}
                {a.isCorrect === false && (
                  <XCircle className="w-3.5 h-3.5 text-red-500 inline" />
                )}
                {a.isCorrect === undefined && (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="py-1.5 text-center">
                {a.isLiked && (
                  <Heart className="w-3.5 h-3.5 text-pink-500 inline" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Block Row (enhanced with stats + detail expand)
// ============================================================================

function BlockRow({
  block,
  order,
  stats,
  progress,
}: {
  block: BlockV2;
  order: number;
  stats?: BlockStats;
  progress?: UserProgress[];
}) {
  const [showJson, setShowJson] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const textContent =
    block.steps?.find((s) => s.type === "text" && s.content)?.content ??
    block.content;
  const contentPreview = textContent
    ? stripMarkdown(textContent).slice(0, 120)
    : "—";

  const hasAnswerData = block.type === "question" || block.type === "exercise";

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div className="flex items-start gap-3 py-3 px-4">
        <span className="text-xs font-mono text-gray-400 pt-0.5 w-6 text-right flex-shrink-0">
          {order}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <BlockTypeBadge block={block} />
            <span className="text-xs text-gray-400 font-mono">
              {block.block_id}
            </span>
            {(block.xp ?? 0) > 0 && (
              <span className="text-xs text-amber-600 font-medium">
                {block.xp} XP
              </span>
            )}
            {block.learning?.difficulty && (
              <span className="text-xs text-gray-400">
                diff {block.learning.difficulty}/5
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 mt-1 line-clamp-2">
            {contentPreview}
          </p>
          <QuestionDetail block={block} />
          {/* Inline stats */}
          {stats && (
            <div className="mt-2">
              <StatsBar stats={stats} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {hasAnswerData && (
            <button
              onClick={() => setShowDetail(!showDetail)}
              title="Detail odpovědí"
              className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs transition-colors ${
                showDetail
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setShowJson(!showJson)}
            title="Zobrazit JSON"
            className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs transition-colors ${
              showJson
                ? "bg-gray-200 text-gray-900"
                : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {showDetail && (
        <div className="bg-blue-50/50 border-t border-blue-100">
          <BlockDetailView block={block} progress={progress} />
        </div>
      )}
      {showJson && (
        <div className="px-4 pb-3">
          <pre className="text-xs text-gray-600 font-mono bg-gray-50 rounded-lg border border-gray-200 p-3 whitespace-pre-wrap overflow-x-auto">
            {JSON.stringify(block, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Lesson Section (enhanced with aggregate stats)
// ============================================================================

function LessonSection({
  lesson,
  lessonIndex,
  blocksMap,
  blockStatsMap,
  progress,
}: {
  lesson: LessonV2;
  lessonIndex: number;
  blocksMap: Map<string, BlockV2>;
  blockStatsMap: Map<string, BlockStats>;
  progress: UserProgress[] | undefined;
}) {
  const [expanded, setExpanded] = useState(true);

  const stats = useMemo(() => {
    let display = 0;
    let question = 0;
    let exercise = 0;
    let totalXp = 0;
    let totalAttempts = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    for (const binding of lesson.blocks) {
      const block = blocksMap.get(binding.block_id);
      if (!block) continue;
      if (block.type === "display") display++;
      else if (block.type === "exercise") exercise++;
      else question++;
      totalXp += block.xp ?? 0;
      const bs = blockStatsMap.get(binding.block_id);
      if (bs) {
        totalAttempts += bs.total_attempts;
        totalCorrect += bs.correct_count;
        totalIncorrect += bs.incorrect_count;
      }
    }
    const answerTotal = totalCorrect + totalIncorrect;
    const avgCorrectRate =
      answerTotal > 0 ? Math.round((totalCorrect / answerTotal) * 100) : -1;
    return {
      display,
      question,
      exercise,
      total: display + question + exercise,
      totalXp,
      totalAttempts,
      avgCorrectRate,
    };
  }, [lesson.blocks, blocksMap, blockStatsMap]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-gray-400">
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>
        <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="font-medium text-gray-900">
            {lessonIndex + 1}. {lesson.name}
          </span>
          {lesson.description && (
            <span className="text-sm text-gray-500 ml-2">
              — {lesson.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
          <span>{stats.total} bloků</span>
          {stats.question > 0 && (
            <span className="text-blue-600">{stats.question} otázek</span>
          )}
          {stats.exercise > 0 && (
            <span className="text-amber-600">{stats.exercise} cvičení</span>
          )}
          {stats.totalXp > 0 && (
            <span className="text-amber-600">{stats.totalXp} XP</span>
          )}
          {stats.totalAttempts > 0 && (
            <span className="text-gray-400">
              {stats.totalAttempts} pokusů
            </span>
          )}
          {stats.avgCorrectRate >= 0 && (
            <span className={rateTextColor(stats.avgCorrectRate)}>
              {stats.avgCorrectRate}% správně
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-200">
          {lesson.blocks.length === 0 ? (
            <p className="text-sm text-gray-400 italic px-4 py-3">
              Žádné bloky v této lekci
            </p>
          ) : (
            lesson.blocks
              .sort((a, b) => a.order - b.order)
              .map((binding, idx) => {
                const block = blocksMap.get(binding.block_id);
                if (!block) {
                  return (
                    <div
                      key={binding.block_id}
                      className="px-4 py-3 text-xs text-red-400 border-b border-gray-100"
                    >
                      Chybějící blok: {binding.block_id}
                    </div>
                  );
                }
                return (
                  <BlockRow
                    key={binding.block_id}
                    block={block}
                    order={idx + 1}
                    stats={blockStatsMap.get(binding.block_id)}
                    progress={progress}
                  />
                );
              })
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// User Answers Tab
// ============================================================================

function UserAnswersTab({
  progress,
  isLoading,
  lessons,
  blocksMap,
  selectedLesson,
  onSelectLesson,
}: {
  progress: UserProgress[] | undefined;
  isLoading: boolean;
  lessons: LessonV2[];
  blocksMap: Map<string, BlockV2>;
  selectedLesson: string;
  onSelectLesson: (id: string) => void;
}) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="sm" />
        <span className="ml-2 text-sm text-gray-500">
          Načítání odpovědí uživatelů...
        </span>
      </div>
    );
  }

  if (!progress?.length) {
    return (
      <p className="text-sm text-gray-500 italic py-8 text-center">
        Žádná data o postupu uživatelů
      </p>
    );
  }

  // Filter by lesson
  const filtered = selectedLesson
    ? progress.filter((p) => p.lesson_id === selectedLesson)
    : progress;

  return (
    <div className="space-y-4">
      {/* Lesson filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Filtr lekce:</label>
        <select
          value={selectedLesson}
          onChange={(e) => onSelectLesson(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-2 py-1"
        >
          <option value="">Všechny lekce</option>
          {lessons.map((l) => (
            <option key={l.lesson_id} value={l.lesson_id}>
              {l.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-400 ml-2">
          {filtered.length} záznamů
        </span>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-2 pr-3">Uživatel</th>
              <th className="px-4 py-2 pr-3">Lekce</th>
              <th className="px-4 py-2 pr-3 text-center">Postup</th>
              <th className="px-4 py-2 pr-3 text-center">Čas</th>
              <th className="px-4 py-2 pr-3 text-center">Dokončeno</th>
              <th className="px-4 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const isExpanded = expandedRow === p.id;
              const lessonName =
                lessons.find((l) => l.lesson_id === p.lesson_id)?.name ??
                p.lesson_id;
              return (
                <UserAnswerRow
                  key={p.id}
                  progress={p}
                  lessonName={lessonName}
                  isExpanded={isExpanded}
                  onToggle={() =>
                    setExpandedRow(isExpanded ? null : p.id)
                  }
                  blocksMap={blocksMap}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserAnswerRow({
  progress: p,
  lessonName,
  isExpanded,
  onToggle,
  blocksMap,
}: {
  progress: UserProgress;
  lessonName: string;
  isExpanded: boolean;
  onToggle: () => void;
  blocksMap: Map<string, BlockV2>;
}) {
  const blockEntries = Object.entries(p.progress_data?.blocks ?? {});

  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-4 py-2 pr-3">
          <div className="font-medium text-gray-900">
            {p.user?.name ?? `User #${p.id}`}
          </div>
          {p.user?.email && (
            <div className="text-xs text-gray-400">{p.user.email}</div>
          )}
        </td>
        <td className="px-4 py-2 pr-3 text-gray-700">{lessonName}</td>
        <td className="px-4 py-2 pr-3 text-center">
          <div className="flex items-center gap-2 justify-center">
            <div className="w-16 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full"
                style={{
                  width: `${Math.min(p.progress_percent, 100)}%`,
                }}
              />
            </div>
            <span className="text-xs text-gray-600">
              {p.progress_percent}%
            </span>
          </div>
        </td>
        <td className="px-4 py-2 pr-3 text-center text-gray-700">
          {formatSeconds(p.time_spent_seconds)}
        </td>
        <td className="px-4 py-2 pr-3 text-center">
          {p.is_completed ? (
            <CheckCircle2 className="w-4 h-4 text-green-600 inline" />
          ) : (
            <Clock className="w-4 h-4 text-gray-400 inline" />
          )}
        </td>
        <td className="px-4 py-2 text-center">
          <span className="text-gray-400">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 inline" />
            ) : (
              <ChevronRight className="w-4 h-4 inline" />
            )}
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="bg-gray-50 px-4 py-3">
            {blockEntries.length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                Žádná data o blocích
              </p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-600 mb-2">
                  Odpovědi po blocích ({blockEntries.length})
                </p>
                {blockEntries.map(([blockId, data]) => {
                  const block = blocksMap.get(blockId);
                  const q =
                    block?.steps?.find((s) => s.type === "question")?.question ??
                    block?.question;
                  // Resolve displayed answer: for MC, show option text
                  let displayAnswer = data.answer ?? "-";
                  if (q?.options && data.answer) {
                    const opt = q.options.find(
                      (o) => o.id === data.answer || o.text === data.answer
                    );
                    if (opt) displayAnswer = opt.text;
                  }
                  return (
                    <div
                      key={blockId}
                      className="flex items-center gap-3 text-xs py-1 border-b border-gray-100 last:border-b-0"
                    >
                      <span className="font-mono text-gray-400 w-40 truncate flex-shrink-0">
                        {blockId}
                      </span>
                      {block && <BlockTypeBadge block={block} />}
                      <span className="text-gray-700 flex-1 truncate">
                        {displayAnswer}
                      </span>
                      <span>
                        {data.isCorrect === true && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        )}
                        {data.isCorrect === false && (
                          <XCircle className="w-3.5 h-3.5 text-red-500" />
                        )}
                      </span>
                      {p.progress_data?.block_feedback?.[blockId]?.isLiked && (
                        <Heart className="w-3.5 h-3.5 text-pink-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ============================================================================
// Quiz Tab
// ============================================================================

function QuizTab({
  quizData,
  isLoading,
  blocksMap,
}: {
  quizData: QuizAttemptsResponse | undefined;
  isLoading: boolean;
  blocksMap: Map<string, BlockV2>;
}) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="sm" />
        <span className="ml-2 text-sm text-gray-500">
          Načítání kvízových pokusů...
        </span>
      </div>
    );
  }

  if (!quizData?.data?.length) {
    return (
      <p className="text-sm text-gray-500 italic py-8 text-center">
        Žádné kvízové pokusy
      </p>
    );
  }

  const { meta } = quizData;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center">
          <div className="text-xs text-gray-500">Celkem pokusů</div>
          <div className="text-xl font-semibold text-gray-900">
            {meta.total_attempts}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center">
          <div className="text-xs text-gray-500">Unikátních uživatelů</div>
          <div className="text-xl font-semibold text-gray-900">
            {meta.unique_users}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center">
          <div className="text-xs text-gray-500">Průměrné skóre</div>
          <div className="text-xl font-semibold text-gray-900">
            {Math.round(meta.avg_score)}%
          </div>
        </div>
      </div>

      {/* Attempts table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-2 pr-3">Uživatel</th>
              <th className="px-4 py-2 pr-3 text-center">Skóre</th>
              <th className="px-4 py-2 pr-3 text-center">Správně / Celkem</th>
              <th className="px-4 py-2 pr-3 text-center">Čas</th>
              <th className="px-4 py-2 pr-3">Datum</th>
              <th className="px-4 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {quizData.data.map((attempt, idx) => (
              <QuizAttemptRow
                key={idx}
                attempt={attempt}
                isExpanded={expandedRow === idx}
                onToggle={() =>
                  setExpandedRow(expandedRow === idx ? null : idx)
                }
                blocksMap={blocksMap}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuizAttemptRow({
  attempt,
  isExpanded,
  onToggle,
  blocksMap,
}: {
  attempt: QuizAttempt;
  isExpanded: boolean;
  onToggle: () => void;
  blocksMap: Map<string, BlockV2>;
}) {
  const scoreColor =
    attempt.score_percent >= 80
      ? "text-green-700 bg-green-50"
      : attempt.score_percent >= 60
        ? "text-yellow-700 bg-yellow-50"
        : "text-red-700 bg-red-50";

  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-4 py-2 pr-3">
          <div className="font-medium text-gray-900">
            {attempt.user?.name}
          </div>
          <div className="text-xs text-gray-400">{attempt.user?.email}</div>
        </td>
        <td className="px-4 py-2 pr-3 text-center">
          <span
            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${scoreColor}`}
          >
            {Math.round(attempt.score_percent)}%
          </span>
        </td>
        <td className="px-4 py-2 pr-3 text-center text-gray-700">
          {attempt.correct_answers} / {attempt.total_questions}
        </td>
        <td className="px-4 py-2 pr-3 text-center text-gray-700">
          {formatSeconds(attempt.time_spent_seconds)}
        </td>
        <td className="px-4 py-2 pr-3 text-gray-500 text-xs">
          {new Date(attempt.created_at).toLocaleString("cs-CZ")}
        </td>
        <td className="px-4 py-2 text-center">
          <span className="text-gray-400">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 inline" />
            ) : (
              <ChevronRight className="w-4 h-4 inline" />
            )}
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="bg-gray-50 px-4 py-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-600 mb-2">
                Odpovědi ({parseAnswers(attempt.answers).length})
              </p>
              {parseAnswers(attempt.answers).map((a) => {
                // Resolve answer text from block question options
                const block = blocksMap.get(a.question_id);
                const q =
                  block?.steps?.find((s) => s.type === "question")?.question ??
                  block?.question;
                const selectedOpt = q?.options?.find(
                  (o) => o.id === a.selected_answer
                );
                const correctOpt = q?.options?.find((o) => o.is_correct);
                const questionText = block?.steps?.find(
                  (s) => s.type === "text" && s.content
                )?.content ?? block?.content;
                const questionPreview = questionText
                  ? stripMarkdown(questionText).slice(0, 80)
                  : a.question_id;

                return (
                  <div
                    key={a.question_index}
                    className="flex items-start gap-3 text-xs py-1.5 border-b border-gray-100 last:border-b-0"
                  >
                    <span className="font-mono text-gray-400 w-6 text-right flex-shrink-0 pt-0.5">
                      {a.question_index + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-500 truncate mb-0.5" title={questionPreview}>
                        {questionPreview}
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${
                            a.is_correct ? "text-green-700" : "text-red-600"
                          }`}
                        >
                          {selectedOpt?.text ?? a.selected_answer}
                        </span>
                        {!a.is_correct && correctOpt && (
                          <span className="text-gray-400">
                            (správně: <span className="text-green-700">{correctOpt.text}</span>)
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="flex-shrink-0 pt-0.5">
                      {a.is_correct ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                      )}
                    </span>
                    {a.answered_at && (
                      <span className="text-gray-400 flex-shrink-0 pt-0.5 w-14 text-right">
                        {new Date(a.answered_at).toLocaleTimeString("cs-CZ", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function CourseResultsPage({
  params,
}: {
  params: { id: string };
}) {
  const courseId = Number(params.id);
  const { data: course } = useCourse(courseId);
  const { data: courseData, isLoading, error } = useCourseData(courseId);

  // Derive string course_id for progress API
  const stringCourseId = course?.course_id;

  // Progress data
  const {
    data: progressStats,
    isLoading: statsLoading,
  } = useCourseProgressStats(stringCourseId);
  const {
    data: progress,
    isLoading: progressLoading,
  } = useCourseProgress(stringCourseId);

  // Quiz attempts data
  const {
    data: quizData,
    isLoading: quizLoading,
  } = useQuizAttempts(stringCourseId);

  // Lesson filter state (for User Answers tab)
  const [selectedLesson, setSelectedLesson] = useState("");

  const blocksMap = useMemo(() => {
    const map = new Map<string, BlockV2>();
    if (!courseData?.blocks) return map;
    for (const block of courseData.blocks) {
      map.set(block.block_id, block);
    }
    return map;
  }, [courseData]);

  const blockStatsMap = useMemo(() => {
    const map = new Map<string, BlockStats>();
    if (!progressStats?.blocks) return map;
    for (const bs of progressStats.blocks) {
      map.set(bs.block_id, bs);
    }
    return map;
  }, [progressStats]);

  const courseStats = useMemo(() => {
    if (!courseData) return null;

    let totalBlocks = 0;
    let totalQuestions = 0;
    let totalDisplay = 0;
    let totalExercise = 0;
    let totalXp = 0;

    for (const lesson of courseData.lessons) {
      for (const binding of lesson.blocks) {
        const block = blocksMap.get(binding.block_id);
        if (!block) continue;
        totalBlocks++;
        if (block.type === "question") totalQuestions++;
        else if (block.type === "exercise") totalExercise++;
        else totalDisplay++;
        totalXp += block.xp ?? 0;
      }
    }

    return {
      lessons: courseData.lessons.length,
      totalBlocks,
      totalQuestions,
      totalDisplay,
      totalExercise,
      totalXp,
    };
  }, [courseData, blocksMap]);

  if (isLoading) {
    return <LoadingPage message="Načítání dat kurzu..." />;
  }

  if (error || !courseData) {
    return (
      <div>
        <Link
          href="/admin/courses"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Kurzy
        </Link>
        <p className="text-red-500">Nepodařilo se načíst data kurzu</p>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
      >
        <ArrowLeft className="w-4 h-4" />
        Kurzy
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {course?.emoji && <span className="mr-2">{course.emoji}</span>}
        {course?.name ?? courseData.name}
      </h1>
      <p className="text-gray-500 mb-6">{courseData.description}</p>

      {/* Top-level stats row */}
      <div className="grid grid-cols-2 md:grid-cols-8 gap-3 mb-6">
        {[
          { label: "Lekce", value: courseStats?.lessons ?? 0 },
          { label: "Bloky", value: courseStats?.totalBlocks ?? 0 },
          { label: "Otázky", value: courseStats?.totalQuestions ?? 0 },
          { label: "Procvičování", value: courseStats?.totalExercise ?? 0 },
          { label: "Zobrazení", value: courseStats?.totalDisplay ?? 0 },
          { label: "Celkem XP", value: courseStats?.totalXp ?? 0 },
          {
            label: "Uživatelů",
            value: statsLoading ? "..." : (progressStats?.meta?.total_users ?? 0),
          },
          {
            label: "Bloků se stats",
            value: statsLoading ? "..." : (progressStats?.blocks?.length ?? 0),
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-center"
          >
            <div className="text-xs text-gray-500">{stat.label}</div>
            <div className="text-lg font-semibold text-gray-900">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            Přehled
          </TabsTrigger>
          <TabsTrigger value="answers">
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Odpovědi uživatelů
          </TabsTrigger>
          {(course?.starts_with_quiz || (quizData?.data?.length ?? 0) > 0) && (
            <TabsTrigger value="quiz">
              <Trophy className="w-3.5 h-3.5 mr-1.5" />
              Kvíz
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="space-y-4">
            {courseData.lessons
              .sort((a, b) => a.order - b.order)
              .map((lesson, idx) => (
                <LessonSection
                  key={lesson.lesson_id}
                  lesson={lesson}
                  lessonIndex={idx}
                  blocksMap={blocksMap}
                  blockStatsMap={blockStatsMap}
                  progress={progress}
                />
              ))}
          </div>
        </TabsContent>

        {/* User Answers Tab */}
        <TabsContent value="answers">
          <UserAnswersTab
            progress={progress}
            isLoading={progressLoading}
            lessons={courseData.lessons}
            blocksMap={blocksMap}
            selectedLesson={selectedLesson}
            onSelectLesson={setSelectedLesson}
          />
        </TabsContent>

        {/* Quiz Tab */}
        <TabsContent value="quiz">
          <QuizTab quizData={quizData} isLoading={quizLoading} blocksMap={blocksMap} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
