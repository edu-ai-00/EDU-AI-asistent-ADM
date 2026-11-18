// node:test suite for course-edit.ts (BR-JUWYK2). Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";

import { editCopyOf, editConflictFrom } from "./course-edit.ts";

const listed = { id: 7, course_id: "MAT_ROVNICE", version: 23, status: "draft", vector_id: "v-1" };
const stored = { export_type: "course_v2", course_id: "MAT_ROVNICE", version: 23, status: "draft", lessons: [] };

test("the editor saves against the version it downloaded, not the listed one", () => {
  // The list was loaded before another author saved v24.
  const download = { course_id: "MAT_ROVNICE", version: 24, status: "draft" };
  const { meta } = editCopyOf({ ...stored, version: 24 }, download, listed);

  assert.equal(meta.version, 24);
  assert.equal(meta.vector_id, "v-1");
});

test("a status changed from the course list wins over the stale stored JSON", () => {
  // "Změnit stav" published the course; the stored JSON still says draft.
  const download = { course_id: "MAT_ROVNICE", version: 24, status: "published" };
  const { courseData, meta } = editCopyOf(stored, download, listed);

  assert.equal(courseData.status, "published");
  assert.equal(meta.status, "published");
  assert.deepEqual(courseData.lessons, stored.lessons);
});

test("an API that does not report the status falls back to the listed one", () => {
  const download = { course_id: "MAT_ROVNICE", version: 23 };
  const { courseData } = editCopyOf(stored, download, { ...listed, status: "private" });

  assert.equal(courseData.status, "private");
});

test("only a 409 carrying edit_conflict counts as an edit conflict", () => {
  const conflict = { base_version: 23, current_version: 24, current_status: "draft", updated_at: null };

  assert.deepEqual(editConflictFrom({ status: 409, payload: { edit_conflict: conflict } }), conflict);
  assert.equal(editConflictFrom({ status: 422, payload: { structure_conflict: {} } }), null);
  assert.equal(editConflictFrom(new Error("Network")), null);
  assert.equal(editConflictFrom(undefined), null);
});
