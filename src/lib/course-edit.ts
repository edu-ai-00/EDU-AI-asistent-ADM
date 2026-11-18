import type { ApiError } from "@/lib/api/client";
import type { Course, DownloadResponse, EditConflict } from "@/types/api";
import type { CourseV2 } from "@/types/block-v2";

/**
 * The editor's working copy of a stored course (BR-JUWYK2).
 *
 * `meta.version` is the base the editor saves against: the version the
 * download came from, not the possibly stale one in the course list. The
 * status is the live one too — "Změnit stav" in the course list writes only
 * the database, so the stored JSON can still carry the old status, and
 * saving that back would quietly undo the change.
 */
export function editCopyOf(
  courseData: CourseV2,
  download: DownloadResponse,
  listed: Course
): { courseData: CourseV2; meta: Course } {
  const status = download.status ?? listed.status;

  return {
    courseData: { ...courseData, status },
    meta: { ...listed, version: download.version, status },
  };
}

/**
 * Pull the edit conflict out of a rejected save (BR-JUWYK2): the API answers
 * a save over a course someone else has changed since with a 409 carrying
 * `edit_conflict`.
 */
export function editConflictFrom(error: unknown): EditConflict | null {
  const payload = (error as ApiError | undefined)?.payload;
  const conflict = payload?.edit_conflict as EditConflict | undefined;

  return typeof conflict?.current_version === "number" ? conflict : null;
}
