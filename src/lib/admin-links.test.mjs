// node:test suite for admin-links.ts (BR-H7WZJ5). Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";

import { classroomHref } from "./admin-links.ts";

test("a class link names the tab and the class", () => {
  assert.equal(classroomHref(141), "/admin/users?tab=classrooms&classroom=141");
});

test("a subtab is appended, so the link can land on Učitelé", () => {
  assert.equal(
    classroomHref(141, "teachers"),
    "/admin/users?tab=classrooms&classroom=141&subtab=teachers",
  );
});

test("every subtab of the class detail can be linked to", () => {
  for (const subtab of ["students", "teachers", "courses", "skills"]) {
    assert.equal(classroomHref(7, subtab), `/admin/users?tab=classrooms&classroom=7&subtab=${subtab}`);
  }
});
