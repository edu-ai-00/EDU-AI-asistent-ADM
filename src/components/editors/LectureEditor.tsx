"use client";

import type { Lecture } from "@/types/course";

interface LectureEditorProps {
  lecture: Lecture;
  onChange: (lecture: Lecture) => void;
}

export function LectureEditor({ lecture, onChange }: LectureEditorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-4">Lecture Settings</h2>
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lecture Name
            </label>
            <input
              type="text"
              value={lecture.name}
              onChange={(e) => onChange({ ...lecture, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={lecture.description}
              onChange={(e) =>
                onChange({ ...lecture, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              UUID
            </label>
            <input
              type="text"
              value={lecture.uuid4}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-500 font-mono text-sm"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Lecture Statistics</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">
              {lecture.steps.length}
            </div>
            <div className="text-sm text-gray-600">Steps</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600">
              {lecture.steps.filter((s) => s.response_type === "information").length}
            </div>
            <div className="text-sm text-gray-600">Information</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">
              {lecture.steps.filter((s) => s.response_type === "question").length}
            </div>
            <div className="text-sm text-gray-600">Questions</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Steps Overview</h3>
        <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
          {lecture.steps.map((step, index) => (
            <div key={step.uuid4} className="p-3 flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500 w-8">
                #{index + 1}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  step.response_type === "question"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {step.response_type}
              </span>
              <span className="text-sm text-gray-700 flex-1 truncate">
                {step.description || step.text?.slice(0, 50) || "No content"}
              </span>
              {step.answers.length > 0 && (
                <span className="text-xs text-gray-500">
                  {step.answers.length} answers
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
