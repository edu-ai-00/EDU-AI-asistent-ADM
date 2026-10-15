"use client";

// AI Course Assistant (BR-D4PE8R) — step 4: review and pick what to insert.

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { allDraftKeys, draftBlockLabel, draftKey } from "@/lib/generation/inflate";
import type { CourseDraft, DraftBlock } from "@/types/generation";

interface StepPreviewProps {
  draft: CourseDraft;
  onBack: () => void;
  onInsert: (selection: Set<string>) => void;
}

const TYPE_BADGES: Record<DraftBlock["type"], { label: string; className: string }> = {
  display: { label: "výklad", className: "bg-gray-100 text-gray-600" },
  question: { label: "otázka", className: "bg-blue-100 text-blue-700" },
  exercise: { label: "cvičení", className: "bg-purple-100 text-purple-700" },
};

export function StepPreview({ draft, onBack, onInsert }: StepPreviewProps) {
  const [selection, setSelection] = useState<Set<string>>(() => allDraftKeys(draft));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const totalBlocks = useMemo(
    () => draft.lessons.reduce((sum, lesson) => sum + lesson.blocks.length, 0),
    [draft]
  );

  const toggle = (key: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleLesson = (lessonIndex: number, blockCount: number) => {
    const keys = Array.from({ length: blockCount }, (_, i) => draftKey(lessonIndex, i));
    const allSelected = keys.every((k) => selection.has(k));

    setSelection((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => (allSelected ? next.delete(k) : next.add(k)));
      return next;
    });
  };

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Vybráno {selection.size} z {totalBlocks} bloků v {draft.lessons.length}{" "}
          {draft.lessons.length === 1 ? "lekci" : "lekcích"}.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSelection(allDraftKeys(draft))}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
          >
            <Check className="h-3 w-3" />
            Vybrat vše
          </button>
          <button
            type="button"
            onClick={() => setSelection(new Set())}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
          >
            <X className="h-3 w-3" />
            Zrušit výběr
          </button>
        </div>
      </div>

      <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
        {draft.lessons.map((lesson, lessonIndex) => (
          <div key={lessonIndex} className="rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => toggleLesson(lessonIndex, lesson.blocks.length)}
              className="flex w-full items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-3 py-2 text-left"
            >
              <span className="truncate text-sm font-medium text-gray-900">{lesson.name}</span>
              <span className="shrink-0 text-xs text-gray-500">
                {lesson.blocks.length} bloků
              </span>
            </button>

            <ul className="divide-y divide-gray-100">
              {lesson.blocks.map((block, blockIndex) => {
                const key = draftKey(lessonIndex, blockIndex);
                const badge = TYPE_BADGES[block.type];
                const isExpanded = expanded.has(key);

                return (
                  <li key={key} className="px-3 py-2">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selection.has(key)}
                        onChange={() => toggle(key)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300"
                        aria-label={`Vložit blok ${blockIndex + 1}`}
                      />
                      <span
                        className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(key)}
                        className="flex flex-1 items-start gap-1 text-left text-sm text-gray-700 hover:text-gray-900"
                      >
                        {isExpanded ? (
                          <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                        ) : (
                          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                        )}
                        <span className={isExpanded ? "" : "line-clamp-2"}>
                          {draftBlockLabel(block)}
                        </span>
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-2 space-y-2 pl-8">
                        {block.steps.map((step, stepIndex) => (
                          <div key={stepIndex} className="rounded bg-gray-50 p-2">
                            <p className="whitespace-pre-wrap text-xs text-gray-700">
                              {step.content}
                            </p>
                            {step.question?.options && (
                              <ul className="mt-1 space-y-0.5">
                                {step.question.options.map((option) => (
                                  <li
                                    key={option.id}
                                    className={`text-xs ${
                                      option.is_correct
                                        ? "font-medium text-green-700"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {option.is_correct ? "✓" : "·"} {option.text}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {step.question?.solution && (
                              <p className="mt-1 text-xs italic text-gray-500">
                                Řešení: {step.question.solution}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button variant="secondary" onClick={onBack}>
          Zpět
        </Button>
        <Button onClick={() => onInsert(selection)} disabled={selection.size === 0}>
          Vložit do kurzu ({selection.size})
        </Button>
      </div>
    </div>
  );
}
