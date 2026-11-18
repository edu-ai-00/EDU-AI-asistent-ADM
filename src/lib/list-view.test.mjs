// node:test suite for list-view.ts (BR-DN8BWW). Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";

import { listView } from "./list-view.ts";

const state = (over) => ({
  isLoading: false,
  hasError: false,
  hasData: true,
  rowCount: 0,
  ...over,
});

test("a first load shows the spinner, not the empty state", () => {
  assert.deepEqual(listView(state({ isLoading: true, hasData: false })), {
    body: "loading",
    inlineError: false,
  });
});

// BR-DN8BWW: the failed load used to fall through to "Pro zvolené filtry
// nejsou žádné záznamy aktivity.", so the page claimed there was no activity
// when in truth nothing had been loaded.
test("a load that failed with nothing in hand is an error, never empty", () => {
  assert.deepEqual(listView(state({ hasError: true, hasData: false })), {
    body: "error",
    inlineError: false,
  });
});

test("a retry of a failed load goes back to the spinner", () => {
  assert.deepEqual(
    listView(state({ isLoading: true, hasError: true, hasData: false })),
    { body: "loading", inlineError: false }
  );
});

test("a load that succeeded with no rows is the empty state", () => {
  assert.deepEqual(listView(state({ rowCount: 0 })), {
    body: "empty",
    inlineError: false,
  });
});

test("rows are a list", () => {
  assert.deepEqual(listView(state({ rowCount: 3 })), {
    body: "list",
    inlineError: false,
  });
});

test("rows left over from an earlier load stay, with the error above them", () => {
  assert.deepEqual(listView(state({ hasError: true, rowCount: 3 })), {
    body: "list",
    inlineError: true,
  });
});

// The last load that worked really did come back empty — the empty state is
// about that payload, and the failed refetch is reported above it.
test("an empty payload plus a failed refetch keeps the empty state and reports the error", () => {
  assert.deepEqual(listView(state({ hasError: true, rowCount: 0 })), {
    body: "empty",
    inlineError: true,
  });
});
