// node:test suite for the Sentry user scope in user.ts. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// user.ts calls the real SDK; swap it for a recorder so the test sees the
// scope calls without starting Sentry.
const SENTRY_STUB = `
  export const calls = [];
  export const setUser = (user) => calls.push(["setUser", user]);
  export const setTag = (key, value) => calls.push(["setTag", key, value]);
`;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@sentry/nextjs") {
      return {
        url: `data:text/javascript,${encodeURIComponent(SENTRY_STUB)}`,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const { calls } = await import("@sentry/nextjs");
const { sentryUserFor, setSentryUser } = await import("./user.ts");

const TEACHER = { id: 42, name: "Jana Nováková", email: "jana@skola.cz", role: "teacher" };

test("the Sentry user is the staff member's id and e-mail, without the name", () => {
  assert.deepEqual(sentryUserFor(TEACHER), { id: "42", email: "jana@skola.cz" });
});

test("signing in sets the user and a role tag", () => {
  calls.length = 0;
  setSentryUser(TEACHER);
  assert.deepEqual(calls, [
    ["setUser", { id: "42", email: "jana@skola.cz" }],
    ["setTag", "role", "teacher"],
  ]);
});

test("signing out clears both", () => {
  calls.length = 0;
  setSentryUser(null);
  assert.deepEqual(calls, [
    ["setUser", null],
    ["setTag", "role", undefined],
  ]);
});
