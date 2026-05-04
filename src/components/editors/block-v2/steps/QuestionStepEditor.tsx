"use client";

import { Plus, Trash2 } from "lucide-react";
import type {
  BlockStep,
  BlockType,
  BlockV2,
  QuestionConfig,
  QuestionOption,
} from "@/types/block-v2";
import { QUESTION_TYPE_LABELS } from "@/lib/defaults";
import { cn } from "@/lib/utils";
import { MarkdownTextarea } from "@/components/MarkdownTextarea";

export interface QuestionStepEditorProps {
  question: QuestionConfig;
  blockType: BlockType;
  allSteps: BlockStep[];
  courseBlocks?: BlockV2[];
  currentBlockId?: string;
  onChange: (question: QuestionConfig) => void;
}

export function QuestionStepEditor({
  question,
  blockType,
  allSteps,
  courseBlocks,
  currentBlockId,
  onChange,
}: QuestionStepEditorProps) {
  const q = question;
  const showGoTo = blockType === "question";

  const updateQuestion = (updates: Partial<QuestionConfig>) => {
    onChange({ ...q, ...updates });
  };

  const addOption = () => {
    const options = q.options || [];
    const newOption: QuestionOption = {
      id: `opt_${options.length + 1}`,
      text: "",
      is_correct: false,
    };
    updateQuestion({ options: [...options, newOption] });
  };

  const removeOption = (index: number) => {
    const options = q.options || [];
    updateQuestion({ options: options.filter((_, i) => i !== index) });
  };

  const updateOption = (index: number, updates: Partial<QuestionOption>) => {
    const options = q.options || [];
    updateQuestion({
      options: options.map((o, i) => (i === index ? { ...o, ...updates } : o)),
    });
  };

  const initTrueFalseOptions = (): QuestionOption[] => {
    if (!q.options || q.options.length !== 2 ||
        q.options[0].id !== "true" || q.options[1].id !== "false") {
      return [
        { id: "true", text: "True (Ano)", is_correct: (q.correct_answer || "true") === "true" },
        { id: "false", text: "False (Ne)", is_correct: (q.correct_answer || "true") === "false" },
      ];
    }
    return q.options;
  };

  const handleTypeChange = (newType: QuestionConfig["type"]) => {
    const updates: Partial<QuestionConfig> = { type: newType };
    if (newType === "true_false") {
      updates.options = initTrueFalseOptions();
      updates.correct_answer = q.correct_answer || "true";
    }
    updateQuestion(updates);
  };

  // Build go_to options: steps in this block + other blocks in course
  const otherBlocks = (courseBlocks || []).filter(b => b.block_id !== currentBlockId);

  const renderGoToSelect = (value: string | undefined, onChangeValue: (v: string | undefined) => void) => (
    <select
      value={value || ""}
      onChange={(e) => onChangeValue(e.target.value || undefined)}
      className="w-36 px-1 py-1 text-xs border border-gray-200 rounded"
      title="Navigation target"
    >
      <option value="">(none)</option>
      <optgroup label="Navigation">
        <option value="NEXT_STEP">NEXT_STEP</option>
        <option value="AGAIN">AGAIN</option>
        <option value="END">END</option>
      </optgroup>
      {allSteps.length > 0 && (
        <optgroup label="Steps">
          {allSteps.map(s => (
            <option key={s.id} value={s.id}>→ {s.id} ({s.type})</option>
          ))}
        </optgroup>
      )}
      {otherBlocks.length > 0 && (
        <optgroup label="Blocks">
          {otherBlocks.map(b => (
            <option key={b.block_id} value={b.block_id}>⬒ {b.block_id}</option>
          ))}
        </optgroup>
      )}
    </select>
  );

  return (
    <div className="space-y-4">
      {/* Question Type Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Question Type
          </label>
          <select
            value={q.type}
            onChange={(e) => handleTypeChange(e.target.value as QuestionConfig["type"])}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {q.type === "open" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correct Answer
            </label>
            <input
              type="text"
              value={q.correct_answer || ""}
              onChange={(e) => updateQuestion({ correct_answer: e.target.value || undefined })}
              placeholder="Expected answer"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        )}

        {q.type === "multiple_choice" && (
          <div className="flex items-center gap-4 pt-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={q.allow_multiple || false}
                onChange={(e) => updateQuestion({ allow_multiple: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Allow multiple</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={q.show_answers !== false}
                onChange={(e) => updateQuestion({ show_answers: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Show answers</span>
            </label>
          </div>
        )}
      </div>

      {/* Multiple Choice Options */}
      {q.type === "multiple_choice" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Answer Options
            </label>
            <button
              onClick={addOption}
              className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Option
            </button>
          </div>

          {(q.options || []).map((option, index) => (
            <div
              key={option.id}
              className={cn(
                "p-3 rounded border space-y-2",
                option.is_correct
                  ? "bg-green-50 border-green-200"
                  : "bg-white border-gray-200"
              )}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={option.is_correct}
                  onChange={(e) => updateOption(index, { is_correct: e.target.checked })}
                  className="rounded border-gray-300"
                  title="Mark as correct answer"
                />
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) => updateOption(index, { text: e.target.value })}
                  placeholder="Option text"
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                />
                <button
                  onClick={() => removeOption(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 pl-6">
                <input
                  type="text"
                  value={option.feedback || ""}
                  onChange={(e) => updateOption(index, { feedback: e.target.value || undefined })}
                  placeholder="Feedback (markdown/LaTeX)"
                  className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded text-gray-600"
                />
                <select
                  value={option.mark || ""}
                  onChange={(e) => updateOption(index, { mark: e.target.value || undefined })}
                  className="w-16 px-1 py-1 text-xs border border-gray-200 rounded"
                  title="Známka"
                >
                  <option value="">Mark</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
                <input
                  type="number"
                  value={option.score_koef ?? ""}
                  onChange={(e) => updateOption(index, { score_koef: e.target.value ? parseFloat(e.target.value) : undefined })}
                  step={0.1}
                  min={0}
                  max={1}
                  placeholder="Score"
                  className="w-16 px-1 py-1 text-xs border border-gray-200 rounded"
                  title="Score coefficient (0-1)"
                />
                {showGoTo && renderGoToSelect(option.go_to, (v) => updateOption(index, { go_to: v }))}
              </div>
            </div>
          ))}

          {(q.options || []).length === 0 && (
            <p className="text-sm text-gray-400 italic py-2">No options added yet</p>
          )}
        </div>
      )}

      {/* True/False Options */}
      {q.type === "true_false" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            True/False Options
          </label>
          {(q.options || initTrueFalseOptions()).map((option, index) => (
            <div
              key={option.id}
              className={cn(
                "p-3 rounded border space-y-2",
                option.is_correct
                  ? "bg-green-50 border-green-200"
                  : "bg-white border-gray-200"
              )}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`tf_correct_${q.type}`}
                  checked={option.is_correct}
                  onChange={() => {
                    const opts = q.options || initTrueFalseOptions();
                    const updated = opts.map((o, i) => ({ ...o, is_correct: i === index }));
                    updateQuestion({ options: updated, correct_answer: option.id });
                  }}
                  className="border-gray-300"
                  title="Mark as correct"
                />
                <span className="text-sm font-medium">{option.text}</span>
              </div>
              <div className="flex gap-2 pl-6">
                <input
                  type="text"
                  value={option.feedback || ""}
                  onChange={(e) => updateOption(index, { feedback: e.target.value || undefined })}
                  placeholder="Feedback (markdown/LaTeX)"
                  className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded text-gray-600"
                />
                <select
                  value={option.mark || ""}
                  onChange={(e) => updateOption(index, { mark: e.target.value || undefined })}
                  className="w-16 px-1 py-1 text-xs border border-gray-200 rounded"
                  title="Známka"
                >
                  <option value="">Mark</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
                <input
                  type="number"
                  value={option.score_koef ?? ""}
                  onChange={(e) => updateOption(index, { score_koef: e.target.value ? parseFloat(e.target.value) : undefined })}
                  step={0.1}
                  min={0}
                  max={1}
                  placeholder="Score"
                  className="w-16 px-1 py-1 text-xs border border-gray-200 rounded"
                  title="Score coefficient (0-1)"
                />
                {showGoTo && renderGoToSelect(option.go_to, (v) => updateOption(index, { go_to: v }))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Numeric Question */}
      {q.type === "numeric" && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">
            Numeric Answer
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Correct Number
              </label>
              <input
                type="number"
                value={q.correct_number ?? ""}
                onChange={(e) => updateQuestion({ correct_number: e.target.value !== "" ? parseFloat(e.target.value) : undefined })}
                placeholder="e.g. 42"
                step="any"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tolerance (±)
              </label>
              <input
                type="number"
                value={q.tolerance ?? ""}
                onChange={(e) => updateQuestion({ tolerance: e.target.value !== "" ? parseFloat(e.target.value) : undefined })}
                placeholder="0"
                step="any"
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">
                Accepted range: {q.correct_number !== undefined ? `${q.correct_number - (q.tolerance || 0)} – ${q.correct_number + (q.tolerance || 0)}` : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Solution */}
      <div className="pt-2 border-t border-gray-200 space-y-2">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={q.show_solution !== false}
              onChange={(e) => updateQuestion({ show_solution: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500" />
          </label>
          <span className="text-sm font-medium text-gray-700">Show Solution</span>
        </div>
        <MarkdownTextarea
          value={q.solution || ""}
          onChange={(v) => updateQuestion({ solution: v || undefined })}
          rows={3}
          label="Solution (shown after answering)"
          placeholder="Explain the correct answer here..."
        />
      </div>
    </div>
  );
}
