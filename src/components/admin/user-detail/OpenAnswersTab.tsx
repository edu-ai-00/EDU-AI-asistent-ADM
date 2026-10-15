"use client";

import { AlertTriangle, CheckCircle2, Image as ImageIcon, Sparkles, WifiOff, XCircle } from "lucide-react";
import { useUserOpenAnswers } from "@/hooks/useOpenAnswers";
import type { OpenAnswerEvaluation } from "@/types/api";
import { formatDate } from "./shared";

/**
 * Free-text answers a student gave outside quiz mode (BR-FFVVYR, BR-P745Q8).
 *
 * Quiz answers live in QuizzesTab; these come from lessons and exercises and
 * are stored in `open_answer_evaluations`. Rows without the AI badge were
 * graded by the client's local string comparison — that is the offline/timeout
 * fallback, not a failed evaluation.
 *
 * Everything score-shaped on this screen is teacher-only. The student saw the
 * three feedback parts and nothing else: no score, no percentage, no verdict.
 * The API enforces that split, not this component — see
 * OpenAnswerEvaluationController::format().
 */
export function OpenAnswersTab({ userId }: { userId: number }) {
  const { data: answers, isLoading } = useUserOpenAnswers(userId);

  if (isLoading) {
    return <p className="text-sm text-gray-400 italic py-4">Načítám…</p>;
  }

  if (!answers || answers.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-4">
        Žádné otevřené odpovědi
      </p>
    );
  }

  const aiCount = answers.filter((a) => a.evaluated_by_ai).length;
  const failedCount = answers.filter((a) => a.attempt_status === "failed").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
        <span>{answers.length} odpovědí</span>
        <span className="text-gray-300">·</span>
        <span className="inline-flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          {aiCount} hodnoceno AI
        </span>
        {aiCount < answers.length && (
          <>
            <span className="text-gray-300">·</span>
            <span className="inline-flex items-center gap-1">
              <WifiOff className="w-3.5 h-3.5 text-gray-400" />
              {answers.length - aiCount} bez AI
            </span>
          </>
        )}
        {failedCount > 0 && (
          <>
            <span className="text-gray-300">·</span>
            <span className="inline-flex items-center gap-1 text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5" />
              {failedCount} nevyhodnoceno
            </span>
          </>
        )}
      </div>

      <div className="space-y-2">
        {answers.map((a) => (
          <OpenAnswerCard key={a.id} answer={a} />
        ))}
      </div>
    </div>
  );
}

function OpenAnswerCard({ answer: a }: { answer: OpenAnswerEvaluation }) {
  const score = a.teacher_override_score ?? a.ai_score;
  const failed = a.attempt_status === "failed";
  const parts = a.feedback_parts;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3">
      <div className="flex items-center gap-3 text-xs flex-wrap">
        <span className="font-mono text-gray-700 truncate flex-1 min-w-0">
          {a.block_id}
          {a.step_id ? `/${a.step_id}` : ""}
        </span>

        {/* A retry appends a row rather than replacing one, so the same
            question legitimately appears several times. Without this the list
            reads as duplicates. */}
        {(a.attempt_number ?? 1) > 1 && (
          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-medium flex-shrink-0">
            {a.attempt_number}. pokus
          </span>
        )}

        {failed ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-medium flex-shrink-0">
            <AlertTriangle className="w-3 h-3" />
            Nevyhodnoceno
          </span>
        ) : a.is_correct ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[10px] font-medium flex-shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            Splněno
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-medium flex-shrink-0">
            <XCircle className="w-3 h-3" />
            Nesplněno
          </span>
        )}

        {a.evaluated_by_ai && (
          <span
            title={[
              a.ai_model ? `Model: ${a.ai_model}` : null,
              a.prompt_version ? `Prompt: ${a.prompt_version}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 text-[10px] font-medium flex-shrink-0"
          >
            <Sparkles className="w-3 h-3" />
            AI
            {typeof score === "number" && ` ${score.toFixed(2)}`}
          </span>
        )}

        <span className="text-gray-400 flex-shrink-0">
          {formatDate(a.answered_at ?? null)}
        </span>
      </div>

      {a.answer_text && (
        <p className="mt-2 text-sm text-gray-800 whitespace-pre-wrap break-words">
          {a.answer_text}
        </p>
      )}

      {a.has_photo && (
        <a
          href={`/api/backend/admin/open-answers/${a.id}/photo`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          Vyfocené řešení
        </a>
      )}

      {typeof a.criteria_scores?.length === "number" && a.criteria_scores.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {a.criteria_scores.map((c) => (
            <span
              key={c.id}
              className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px]"
            >
              {c.name || c.id}: {c.score.toFixed(2)}
            </span>
          ))}
        </div>
      )}

      {parts ? (
        <div className="mt-2 text-xs bg-violet-50/60 border-l-2 border-violet-300 px-2 py-1.5 rounded-r space-y-1.5">
          {parts.strengths && (
            <FeedbackPart label="Co je správně" text={parts.strengths} />
          )}
          {parts.improvements && (
            <FeedbackPart label="Co zlepšit" text={parts.improvements} />
          )}
          {parts.next_step && (
            <FeedbackPart label="Co dál" text={parts.next_step} />
          )}
          {parts.hint_question && (
            <FeedbackPart label="Nápověda" text={parts.hint_question} />
          )}
        </div>
      ) : (
        // Rows written before BR-P745Q8 carry only the flat string.
        a.ai_feedback && (
          <p className="mt-2 text-xs text-violet-800 bg-violet-50/60 border-l-2 border-violet-300 px-2 py-1.5 rounded-r whitespace-pre-wrap">
            {a.ai_feedback}
          </p>
        )
      )}

      {a.grading_basis?.expected_answer && (
        <details className="mt-2">
          <summary className="text-[10px] text-gray-500 cursor-pointer hover:text-gray-700">
            Podle čeho se hodnotilo
          </summary>
          <p className="mt-1 text-[11px] text-gray-600 whitespace-pre-wrap border-l-2 border-gray-200 pl-2">
            {a.grading_basis.expected_answer}
          </p>
          {a.grading_basis.criteria?.map((c) => (
            <p key={c.id} className="mt-1 text-[11px] text-gray-500 pl-2">
              • {c.name}
              {typeof c.weight === "number" ? ` (váha ${c.weight})` : ""}
            </p>
          ))}
        </details>
      )}

      <p className="mt-1.5 text-[10px] font-mono text-gray-400 truncate">
        {a.course_id}
        {a.lesson_id ? ` / ${a.lesson_id}` : ""}
      </p>
    </div>
  );
}

function FeedbackPart({ label, text }: { label: string; text: string }) {
  return (
    <p className="text-violet-900 whitespace-pre-wrap">
      <span className="font-medium text-violet-700">{label}: </span>
      {text}
    </p>
  );
}
