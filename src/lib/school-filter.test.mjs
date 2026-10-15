// node:test suite for school-filter.ts (BR-R84FVD). Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ALL_SCHOOLS,
  NO_SCHOOL,
  listedAsTeacher,
  matchesSchool,
  schoolOptions,
} from "./school-filter.ts";

const komenskeho = { id: 1, name: "ZŠ Komenského" };
const palackeho = { id: 2, name: "ZŠ Palackého" };
const cesta = { id: 3, name: "ZŠ Čáslavská" };

test("options list every school the rows mention once, by Czech name order", () => {
  assert.deepEqual(
    schoolOptions([[palackeho, komenskeho], [], [komenskeho], [cesta]]),
    [cesta, komenskeho, palackeho]
  );
});

test("no rows, no options", () => {
  assert.deepEqual(schoolOptions([]), []);
  assert.deepEqual(schoolOptions([[], []]), []);
});

test("the empty filter lets everything through", () => {
  assert.equal(matchesSchool([], ALL_SCHOOLS), true);
  assert.equal(matchesSchool([komenskeho], ALL_SCHOOLS), true);
});

test("a school filter matches a teacher filed under several schools", () => {
  assert.equal(matchesSchool([komenskeho, palackeho], "2"), true);
  assert.equal(matchesSchool([komenskeho], "2"), false);
  assert.equal(matchesSchool([], "2"), false);
});

test("the unfiled filter matches only rows with no school", () => {
  assert.equal(matchesSchool([], NO_SCHOOL), true);
  assert.equal(matchesSchool([komenskeho], NO_SCHOOL), false);
});

// BR-A7KEZ6: an admin invited as a teacher stays an admin and is filed under
// the picked schools — that filing is what lists them among the teachers.
test("every teacher is listed among the teachers, filed or not", () => {
  assert.equal(listedAsTeacher({ role: "teacher", schools: [] }), true);
  assert.equal(listedAsTeacher({ role: "teacher", schools: [komenskeho] }), true);
});

test("an admin is listed among the teachers only once filed under a school", () => {
  assert.equal(listedAsTeacher({ role: "admin", schools: [komenskeho] }), true);
  assert.equal(listedAsTeacher({ role: "admin", schools: [] }), false);
});
