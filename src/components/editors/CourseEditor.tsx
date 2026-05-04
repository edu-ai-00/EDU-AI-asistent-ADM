"use client";

import type { Course } from "@/types/course";

interface CourseEditorProps {
  course: Course;
  onChange: (course: Course) => void;
}

export function CourseEditor({ course, onChange }: CourseEditorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-4">Course Settings</h2>
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Name
            </label>
            <input
              type="text"
              value={course.name}
              onChange={(e) => onChange({ ...course, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={course.description}
              onChange={(e) =>
                onChange({ ...course, description: e.target.value })
              }
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Export Type
            </label>
            <input
              type="text"
              value={course.export_type}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-500"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Course Statistics</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">
              {course.lectures.length}
            </div>
            <div className="text-sm text-gray-600">Lectures</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600">
              {course.lectures.reduce((sum, l) => sum + l.steps.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Steps</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">
              {course.lectures.reduce(
                (sum, l) =>
                  sum +
                  l.steps.filter((s) => s.response_type === "question").length,
                0
              )}
            </div>
            <div className="text-sm text-gray-600">Questions</div>
          </div>
        </div>
      </div>
    </div>
  );
}
