"use client";

import type { AdminBookmark, UserCourseInfo } from "@/types/api";
import { formatDate } from "./shared";

export function ExercisesTab({
  bookmarks,
  courses,
}: {
  bookmarks: AdminBookmark[];
  courses: UserCourseInfo[];
}) {
  if (bookmarks.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-4">
        Žádná uložená cvičení
      </p>
    );
  }

  // Build course_id → course_name lookup from user's courses
  const courseNameMap = new Map<string, string>();
  for (const c of courses) {
    if (c.course_id && c.course_name) {
      courseNameMap.set(c.course_id, c.course_name);
    }
  }

  // Group bookmarks by course_id
  const byCourse = bookmarks.reduce<Record<string, AdminBookmark[]>>(
    (acc, b) => {
      const key = b.course_id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(b);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-4">
      {Object.entries(byCourse).map(([courseId, items]) => (
        <div
          key={courseId}
          className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
        >
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900 font-medium">
                {courseNameMap.get(courseId) ?? courseId}
              </span>
              <span className="text-xs text-gray-500">
                {items.length} {items.length === 1 ? "záložka" : items.length < 5 ? "záložky" : "záložek"}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-200">
                  <th className="px-4 pb-2 pt-3 pr-4">Blok</th>
                  <th className="pb-2 pt-3 pr-4">Lekce</th>
                  <th className="pb-2 pt-3 pr-4">Poznámka</th>
                  <th className="pb-2 pt-3">Datum</th>
                </tr>
              </thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 pr-4 font-mono text-xs text-gray-700 max-w-[200px] truncate">
                      {b.block_id}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-gray-500 max-w-[200px] truncate">
                      {b.lesson_id}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-600 max-w-[250px] truncate">
                      {b.note ?? <span className="text-gray-300">–</span>}
                    </td>
                    <td className="py-2 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(b.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
