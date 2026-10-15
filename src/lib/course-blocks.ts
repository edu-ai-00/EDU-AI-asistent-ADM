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
