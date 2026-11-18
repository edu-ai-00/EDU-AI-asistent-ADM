// One entry per block_id in a course's `blocks` array (BR-XU4Y5K).
//
// Lessons reference blocks by id, so a repeated entry is never reachable on its
// own — but a course JSON could carry one (A2-Rovnice_c1 held a whole lesson's
// blocks twice) and it went straight back out in every save and export. The
// app plays the first match (eduai-app/lib/models/block_model.dart), so that is
// the copy kept here and in the API's App\Support\CourseBlocks.
//
// Kept free of runtime imports so `npm test` can run its node:test suite
// straight from this .ts source.

import type { CourseV2 } from "../types/block-v2";

export function uniqueCourseBlocks<T extends Pick<CourseV2, "blocks">>(course: T): T {
  if (!course.blocks) return course;
  const seen = new Set<string>();
  const blocks = course.blocks.filter((block) => {
    if (!block.block_id) return true;
    if (seen.has(block.block_id)) return false;
    seen.add(block.block_id);
    return true;
  });
  return blocks.length === course.blocks.length ? course : { ...course, blocks };
}

type LessonsAndBlocks = Pick<CourseV2, "lessons" | "blocks">;

// A lesson's blocks split by whether deleting the lesson can take them along
// (BR-FQDZ5U): `own` are bound by no other lesson, `shared` are still used
// elsewhere and must stay. Bindings to blocks missing from `blocks` are skipped.
export function lessonBlockUsage(
  course: LessonsAndBlocks,
  lessonId: string
): { own: string[]; shared: string[] } {
  const lesson = course.lessons.find((l) => l.lesson_id === lessonId);
  if (!lesson) return { own: [], shared: [] };
  const existing = new Set((course.blocks || []).map((b) => b.block_id));
  const usedElsewhere = new Set(
    course.lessons
      .filter((l) => l.lesson_id !== lessonId)
      .flatMap((l) => l.blocks.map((b) => b.block_id))
  );
  const own: string[] = [];
  const shared: string[] = [];
  const seen = new Set<string>();
  for (const { block_id: id } of lesson.blocks) {
    if (seen.has(id) || !existing.has(id)) continue;
    seen.add(id);
    (usedElsewhere.has(id) ? shared : own).push(id);
  }
  return { own, shared };
}

// Drop a lesson and, with `withBlocks`, the blocks only it used. Without it the
// blocks stay in the course and the tree lists them under Unassigned.
export function removeLesson<T extends LessonsAndBlocks>(
  course: T,
  lessonId: string,
  { withBlocks }: { withBlocks: boolean }
): T {
  const lessons = course.lessons.filter((l) => l.lesson_id !== lessonId);
  if (!withBlocks || !course.blocks) return { ...course, lessons };
  const own = new Set(lessonBlockUsage(course, lessonId).own);
  const blocks = course.blocks.filter((b) => !own.has(b.block_id));
  return { ...course, lessons, blocks };
}
