// node:test suite for dashboard-banners.ts (BR-SAWX2U). Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";

import { ROLE_LABELS, xpBandLabel } from "./dashboard-banners.ts";

test("an XP band reads as a range, an open end, or nothing at all", () => {
  assert.equal(xpBandLabel(0, 30), "0–30 XP");
  assert.equal(xpBandLabel(31, 150), "31–150 XP");
  assert.equal(xpBandLabel(101, null), "101+ XP");
  assert.equal(xpBandLabel(null, 100), "do 100 XP");
  assert.equal(xpBandLabel(null, null), "—");
});

test("a zero bound is a bound, not a missing one", () => {
  // `0` is falsy, so a band starting at zero must not read as "no lower end".
  assert.equal(xpBandLabel(0, null), "0+ XP");
  assert.equal(xpBandLabel(null, 0), "do 0 XP");
});

test("the role options name the team as the app's roles read them", () => {
  assert.equal(ROLE_LABELS.all, "Všem");
  assert.equal(ROLE_LABELS.student, "Žákům");
  // A teacher-facing banner reaches admins too — same rule as notifications.
  assert.equal(ROLE_LABELS.teacher, "Učitelům a administrátorům");
});
