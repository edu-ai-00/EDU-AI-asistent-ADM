"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { Step, Answer } from "@/types/course";
import { isBase64Image } from "@/lib/utils";

interface StepEditorProps {
  step: Step;
  onChange: (step: Step) => void;
}

export function StepEditor({ step, onChange }: StepEditorProps) {
  const [expandedAnswers, setExpandedAnswers] = useState<Set<number>>(new Set());

  const toggleAnswer = (index: number) => {
    setExpandedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const updateAnswer = (index: number, updated: Partial<Answer>) => {
    const newAnswers = [...step.answers];
    newAnswers[index] = { ...newAnswers[index], ...updated };
    onChange({ ...step, answers: newAnswers });
  };

  const addAnswer = () => {
    const newAnswer: Answer = {
      text2match: "",
      description: "",
      answer_type: "text",
      position: step.answers.length,
      text: "",
      text2: "",
      correct_answer: false,
      visible_answer: true,
      following_action: "next",
      following_action_id: 0,
      subanswers: [],
    };
    onChange({ ...step, answers: [...step.answers, newAnswer] });
  };

  const removeAnswer = (index: number) => {
    const newAnswers = step.answers.filter((_, i) => i !== index);
    onChange({ ...step, answers: newAnswers });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-4">Step Editor</h2>

        {/* Basic Info */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Step Type
              </label>
              <select
                value={step.step_type}
                onChange={(e) =>
                  onChange({
                    ...step,
                    step_type: e.target.value as "text" | "image",
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text</option>
                <option value="image">Image</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Response Type
              </label>
              <select
                value={step.response_type}
                onChange={(e) =>
                  onChange({
                    ...step,
                    response_type: e.target.value as "information" | "question",
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="information">Information</option>
                <option value="question">Question</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={step.description}
              onChange={(e) => onChange({ ...step, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Internal description for this step"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Main Text
            </label>
            <textarea
              value={step.text}
              onChange={(e) => onChange({ ...step, text: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Main content displayed to the user"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text 2 (Image/Media)
            </label>
            <input
              type="text"
              value={isBase64Image(step.text2) ? "[Base64 Image]" : step.text2}
              onChange={(e) => onChange({ ...step, text2: e.target.value })}
              disabled={isBase64Image(step.text2)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Image URL or reference"
            />
            {isBase64Image(step.text2) && (
              <div className="mt-2">
                <img
                  src={step.text2}
                  alt="Step image"
                  className="max-h-40 rounded border"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text 3 (Additional)
            </label>
            <input
              type="text"
              value={step.text3}
              onChange={(e) => onChange({ ...step, text3: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional hint or note"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="free_input"
              checked={step.free_input}
              onChange={(e) => onChange({ ...step, free_input: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="free_input" className="text-sm text-gray-700">
              Allow free text input
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              UUID
            </label>
            <input
              type="text"
              value={step.uuid4}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-500 font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Answers Section */}
      {step.response_type === "question" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Answers</h3>
            <button
              onClick={addAnswer}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Answer
            </button>
          </div>

          <div className="space-y-2">
            {step.answers.map((answer, index) => (
              <AnswerEditor
                key={index}
                answer={answer}
                index={index}
                isExpanded={expandedAnswers.has(index)}
                onToggle={() => toggleAnswer(index)}
                onChange={(updated) => updateAnswer(index, updated)}
                onRemove={() => removeAnswer(index)}
              />
            ))}
            {step.answers.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">
                No answers defined. Click &quot;Add Answer&quot; to create one.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface AnswerEditorProps {
  answer: Answer;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (updated: Partial<Answer>) => void;
  onRemove: () => void;
}

function AnswerEditor({
  answer,
  index,
  isExpanded,
  onToggle,
  onChange,
  onRemove,
}: AnswerEditorProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-2 p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">Answer {index + 1}</span>
        <span className="text-xs text-gray-500 truncate flex-1">
          {answer.text2match || "No label"}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            answer.correct_answer
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {answer.correct_answer ? "Correct" : "Incorrect"}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1 text-red-500 hover:bg-red-100 rounded"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-3 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Label (text2match)
              </label>
              <input
                type="text"
                value={answer.text2match}
                onChange={(e) => onChange({ text2match: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Answer Type
              </label>
              <select
                value={answer.answer_type}
                onChange={(e) =>
                  onChange({
                    answer_type: e.target.value as Answer["answer_type"],
                  })
                }
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
              >
                <option value="text">Text</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="link">Link</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Feedback (text2)
            </label>
            <textarea
              value={answer.text2}
              onChange={(e) => onChange({ text2: e.target.value })}
              rows={2}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
              placeholder="Feedback shown after selecting this answer"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Following Action
              </label>
              <select
                value={answer.following_action}
                onChange={(e) =>
                  onChange({
                    following_action: e.target.value as Answer["following_action"],
                  })
                }
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
              >
                <option value="next">Next Step</option>
                <option value="again">Try Again</option>
                <option value="lecture">Go to Lecture</option>
                <option value="course">Go to Course</option>
                <option value="code">Execute Code</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Action ID
              </label>
              <input
                type="text"
                value={answer.following_action_id}
                onChange={(e) => onChange({ following_action_id: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                placeholder="Target ID or value"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={answer.correct_answer}
                onChange={(e) => onChange({ correct_answer: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Correct Answer
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={answer.visible_answer}
                onChange={(e) => onChange({ visible_answer: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Visible
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
