"use client";

import type { ReactNode } from "react";
import type {
  AdminBookmark,
  AdminPracticeCard,
  PracticeReviewLog,
  UserCourseInfo,
} from "@/types/api";
import { formatDate } from "./shared";

// FSRS card state → Czech label + badge colour.
const CARD_STATE: Record<number, { label: string; cls: string }> = {
  0: { label: "Nová", cls: "bg-blue-50 text-blue-700" },
  1: { label: "Učení", cls: "bg-amber-50 text-amber-700" },
  2: { label: "Opakování", cls: "bg-green-50 text-green-700" },
  3: { label: "Přeučování", cls: "bg-red-50 text-red-700" },
};

function CardStateBadge({ state }: { state: number }) {
  const s = CARD_STATE[state];
  if (!s) {
    return <span className="text-gray-300">–</span>;
  }
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

/** Due for practice = active and either new or past its due date — mirrors the
 * app's queue partitioning (queue_builder.dart), minus the daily caps. */
function isDueNow(c: AdminPracticeCard): boolean {
  if (!c.is_active) return false;
  if (c.state === 0) return true;
  return c.due_date != null && new Date(c.due_date) <= new Date();
}

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

/** Group header for one course's practice rows.
 *
 * The course label comes from the row's own `course_name` (resolved server-side
 * against the catalog), falling back to the user's enrollments. When neither
 * names it, the id is NOT used as the title — bookmarks pushed by app builds
 * predating BR-952UKZ carry a per-device local Drift row id that maps to no
 * course anywhere, and printing it as a heading read as "the course is called
 * local-df5d3cf2-…". Say it's unknown, keep the id as a small reference. */
function CourseGroupHeader({
  courseId,
  name,
  count,
}: {
  courseId: string;
  name: string | null;
  count: ReactNode;
}) {
  return (
    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className={`text-sm font-medium truncate ${
              name ? "text-gray-900" : "text-gray-500 italic"
            }`}
          >
            {name ?? "Neznámý kurz"}
          </span>
          <span
            className="font-mono text-[10px] text-gray-400 truncate"
            title={courseId}
          >
            {courseId}
          </span>
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">{count}</span>
      </div>
    </div>
  );
}

export function ExercisesTab({
  bookmarks,
  courses,
  practiceCards = [],
  practiceReviews = [],
}: {
  bookmarks: AdminBookmark[];
  courses: UserCourseInfo[];
  practiceCards?: AdminPracticeCard[];
  practiceReviews?: PracticeReviewLog[];
}) {
  if (
    bookmarks.length === 0 &&
    practiceCards.length === 0 &&
    practiceReviews.length === 0
  ) {
    return (
      <p className="text-sm text-gray-400 italic py-4">
        Žádné procvičování
      </p>
    );
  }

  // Build course_id → course_name lookup from user's courses. The API now
  // resolves a name onto each row too; this covers rows from an API that
  // predates that, and costs nothing when they agree.
  const courseNameMap = new Map<string, string>();
  for (const c of courses) {
    if (c.course_id && c.course_name) {
      courseNameMap.set(c.course_id, c.course_name);
    }
  }

  /** Course label for a group, preferring what the API resolved for the row. */
  const nameFor = (
    courseId: string,
    items: { course_name?: string | null }[],
  ): string | null =>
    items.find((i) => i.course_name)?.course_name ??
    courseNameMap.get(courseId) ??
    null;

  // Group bookmarks by course_id
  const bookmarksByCourse = bookmarks.reduce<Record<string, AdminBookmark[]>>(
    (acc, b) => {
      (acc[b.course_id] ??= []).push(b);
      return acc;
    },
    {},
  );

  // Group practice cards by course_id (API returns them due-date-first)
  const cardsByCourse = practiceCards.reduce<
    Record<string, AdminPracticeCard[]>
  >((acc, c) => {
    (acc[c.course_id || "—"] ??= []).push(c);
    return acc;
  }, {});
  const activeCardCount = practiceCards.filter((c) => c.is_active).length;
  const dueCardCount = practiceCards.filter(isDueNow).length;

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
      {/* FSRS practice deck (kartičky) — the same set the app counts as
          "bloky v procvičování", so this number should match the client 1:1 */}
      {practiceCards.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Kartičky procvičování
            </h3>
            <span className="text-xs text-gray-500">
              {activeCardCount} aktivních · {dueCardCount} k procvičení
            </span>
          </div>
          {Object.entries(cardsByCourse).map(([courseId, items]) => (
            <div
              key={courseId}
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
            >
              <CourseGroupHeader
                courseId={courseId}
                name={nameFor(courseId, items)}
                count={
                  <>
                    {items.filter((c) => c.is_active).length} aktivních ·{" "}
                    {items.filter(isDueNow).length} k procvičení
                  </>
                }
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-200">
                      <th className="px-4 pb-2 pt-3 pr-4">Blok</th>
                      <th className="pb-2 pt-3 pr-4">Lekce</th>
                      <th className="pb-2 pt-3 pr-4">Stav</th>
                      <th className="pb-2 pt-3 pr-4">Opak.</th>
                      <th className="pb-2 pt-3">Další opakování</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((c) => (
                      <tr
                        key={c.id}
                        className={`border-b border-gray-100 ${
                          c.is_active ? "" : "opacity-40"
                        }`}
                      >
                        <td className="px-4 py-2 pr-4 font-mono text-xs text-gray-700 max-w-[200px] truncate">
                          {c.block_id}
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs text-gray-500 max-w-[200px] truncate">
                          {c.lesson_id}
                        </td>
                        <td className="py-2 pr-4">
                          {c.is_active ? (
                            <CardStateBadge state={c.state} />
                          ) : (
                            <span className="text-xs text-gray-400">
                              Neaktivní
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-xs text-gray-500">
                          {c.reps}
                        </td>
                        <td className="py-2 text-xs text-gray-500 whitespace-nowrap">
                          {c.due_date ? (
                            formatDate(c.due_date)
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
              <CourseGroupHeader
                courseId={courseId}
                name={nameFor(courseId, items)}
                count={
                  <>
                    {items.length}{" "}
                    {items.length === 1
                      ? "záložka"
                      : items.length < 5
                        ? "záložky"
                        : "záložek"}
                  </>
                }
              />
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
              <CourseGroupHeader
                courseId={courseId}
                name={nameFor(courseId, items)}
                count={
                  <>
                    {items.length}{" "}
                    {items.length === 1
                      ? "průchod"
                      : items.length < 5
                        ? "průchody"
                        : "průchodů"}
                  </>
                }
              />
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
