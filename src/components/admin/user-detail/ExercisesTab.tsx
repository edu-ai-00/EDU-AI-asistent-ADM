"use client";

import type {
  AdminBookmark,
  PracticeReviewLog,
  UserCourseInfo,
} from "@/types/api";
import { formatDate } from "./shared";

// FSRS rating → Czech label + badge colour (BR-DKDAPK).
const RATING: Record<number, { label: string; cls: string }> = {
  1: { label: "Nevím", cls: "bg-red-50 text-red-700" },
  2: { label: "Připomeň", cls: "bg-amber-50 text-amber-700" },
  3: { label: "Jde to", cls: "bg-lime-50 text-lime-700" },
  4: { label: "Pamatuji", cls: "bg-green-50 text-green-700" },
};

function RatingBadge({ rating }: { rating: number }) {
  const r = RATING[rating];
  if (!r) {
    return <span className="text-gray-300">–</span>;
  }
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${r.cls}`}
    >
      {r.label}
    </span>
  );
}

export function ExercisesTab({
  bookmarks,
  courses,
  practiceReviews = [],
}: {
  bookmarks: AdminBookmark[];
  courses: UserCourseInfo[];
  practiceReviews?: PracticeReviewLog[];
}) {
  if (bookmarks.length === 0 && practiceReviews.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-4">
        Žádné procvičování
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
  const bookmarksByCourse = bookmarks.reduce<Record<string, AdminBookmark[]>>(
    (acc, b) => {
      (acc[b.course_id] ??= []).push(b);
      return acc;
    },
    {},
  );

  // Group practice pass-throughs by course_id (API returns them newest-first)
  const reviewsByCourse = practiceReviews.reduce<
    Record<string, PracticeReviewLog[]>
  >((acc, r) => {
    const key = r.course_id ?? "—";
    (acc[key] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Bookmarks (záložky) */}
      {bookmarks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Záložky
          </h3>
          {Object.entries(bookmarksByCourse).map(([courseId, items]) => (
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
                    {items.length}{" "}
                    {items.length === 1
                      ? "záložka"
                      : items.length < 5
                        ? "záložky"
                        : "záložek"}
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
      )}

      {/* Practice pass-throughs (průchody procvičování) — one row per review */}
      {practiceReviews.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Průchody procvičování
          </h3>
          {Object.entries(reviewsByCourse).map(([courseId, items]) => (
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
                    {items.length}{" "}
                    {items.length === 1
                      ? "průchod"
                      : items.length < 5
                        ? "průchody"
                        : "průchodů"}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-200">
                      <th className="px-4 pb-2 pt-3 pr-4">Blok</th>
                      <th className="pb-2 pt-3 pr-4">Lekce</th>
                      <th className="pb-2 pt-3 pr-4">Výsledek</th>
                      <th className="pb-2 pt-3">Čas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r, i) => (
                      <tr
                        key={`${r.block_id}-${r.reviewed_at}-${i}`}
                        className="border-b border-gray-100"
                      >
                        <td className="px-4 py-2 pr-4 font-mono text-xs text-gray-700 max-w-[200px] truncate">
                          {r.block_id ?? <span className="text-gray-300">–</span>}
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs text-gray-500 max-w-[200px] truncate">
                          {r.lesson_id ?? <span className="text-gray-300">–</span>}
                        </td>
                        <td className="py-2 pr-4">
                          <RatingBadge rating={r.rating} />
                        </td>
                        <td className="py-2 text-xs text-gray-500 whitespace-nowrap">
                          {r.reviewed_at ? (
                            formatDate(r.reviewed_at)
                          ) : (
                            <span className="text-gray-300">–</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
