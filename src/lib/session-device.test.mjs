// node:test suite for session-device.ts (BR-Y2TJ74). Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";

import { deviceLabel, recentEntries } from "./session-device.ts";

test("platform and form factor read as one label", () => {
  assert.equal(deviceLabel({ platform: "android", type: "mobile" }), "Android · mobil");
  assert.equal(deviceLabel({ platform: "ios", type: "tablet" }), "iOS · tablet");
  assert.equal(deviceLabel({ platform: "web", type: "desktop" }), "Web · PC");
});

test("a missing half is left out", () => {
  assert.equal(deviceLabel({ platform: "android", type: null }), "Android");
  assert.equal(deviceLabel({ platform: null, type: "tablet" }), "tablet");
});

test("nothing known means no label", () => {
  assert.equal(deviceLabel({ platform: null, type: null }), null);
});

test("unknown values fall back to the raw key", () => {
  assert.equal(deviceLabel({ platform: "fuchsia", type: "watch" }), "fuchsia · watch");
});

// BR-CMA88Y: the registration is listed among the sessions, without work time.
const session = (start) => ({ course_id: "math", start, end: start, duration: 90, devices: [] });
const registration = { platform: "web", type: "desktop", at: "2026-11-05T11:37:00+00:00" };
const rows = (entries) =>
  entries.map((e) => (e.kind === "session" ? e.session.start : `registrace ${e.registration.at}`));

test("a pupil who did nothing still lists the registration", () => {
  assert.deepEqual(rows(recentEntries([], registration)), ["registrace 2026-11-05T11:37:00+00:00"]);
});

test("the registration sorts by its time among the sessions, offsets parsed", () => {
  const sessions = [session("2026-11-05T12:40:00+01:00"), session("2026-11-05T12:30:00+01:00")];
  // 11:37 UTC is 12:37 in Prague: between the two sessions.
  assert.deepEqual(rows(recentEntries(sessions, registration)), [
    "2026-11-05T12:40:00+01:00",
    "registrace 2026-11-05T11:37:00+00:00",
    "2026-11-05T12:30:00+01:00",
  ]);
});

test("the registration drops out once newer sessions fill the list", () => {
  const sessions = ["12", "11", "10"].map((day) => session(`2026-11-${day}T10:00:00+01:00`));
  assert.deepEqual(rows(recentEntries(sessions, registration, 3)), sessions.map((s) => s.start));
});

test("no registration recorded leaves the sessions as they were", () => {
  const sessions = [session("2026-11-05T12:40:00+01:00")];
  assert.deepEqual(rows(recentEntries(sessions, null)), ["2026-11-05T12:40:00+01:00"]);
});
