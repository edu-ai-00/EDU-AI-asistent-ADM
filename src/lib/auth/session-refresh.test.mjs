// node:test suite for session-refresh.ts (BR-9SX9BC). Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  REFRESH_INTERVAL_MS,
  SESSION_COOKIE_FALLBACK_MAX_AGE,
  cookieMaxAge,
  isRefreshDue,
  refreshAtFor,
} from "./session-refresh.ts";

const NOW = Date.parse("2026-09-30T08:00:00Z");
const HOUR = 60 * 60 * 1000;
const inHours = (h) => new Date(NOW + h * HOUR).toISOString();

test("cookies live exactly as long as the token", () => {
  assert.equal(cookieMaxAge(inHours(8), NOW), 8 * 60 * 60);
});

test("cookies fall back to a week when the API gave no usable expiry", () => {
  assert.equal(cookieMaxAge(undefined, NOW), SESSION_COOKIE_FALLBACK_MAX_AGE);
  assert.equal(cookieMaxAge("not a date", NOW), SESSION_COOKIE_FALLBACK_MAX_AGE);
  assert.equal(cookieMaxAge(inHours(-1), NOW), SESSION_COOKIE_FALLBACK_MAX_AGE);
});

test("a 48-hour token keeps its cookies for the whole 48 hours", () => {
  // BR-CAMYRM: the sign-in has to hold 48 hours from the last action; the
  // week cap must not clip the cookies short of the token.
  assert.equal(cookieMaxAge(inHours(48), NOW), 48 * 60 * 60);
});

test("cookies never outlive the week cap", () => {
  assert.equal(cookieMaxAge(inHours(24 * 30), NOW), SESSION_COOKIE_FALLBACK_MAX_AGE);
});

test("an 8-hour token is rotated after the refresh interval, not at the end", () => {
  assert.equal(refreshAtFor(inHours(8), NOW), NOW + REFRESH_INTERVAL_MS);
});

test("a short-lived token is rotated at half its life", () => {
  // SANCTUM_ADMIN_TOKEN_EXPIRATION_MINUTES set below the interval still has
  // to be refreshed before it dies.
  assert.equal(refreshAtFor(inHours(0.25), NOW), NOW + 0.125 * HOUR);
});

test("no usable expiry still schedules the next rotation", () => {
  assert.equal(refreshAtFor(undefined, NOW), NOW + REFRESH_INTERVAL_MS);
  assert.equal(refreshAtFor(inHours(-1), NOW), NOW + REFRESH_INTERVAL_MS);
});

test("a session without a refresh stamp is due at once", () => {
  // Sessions logged in before the stamp existed have to rotate on their next
  // request — that is what first writes it.
  assert.equal(isRefreshDue(undefined, NOW), true);
  assert.equal(isRefreshDue("", NOW), true);
  assert.equal(isRefreshDue("garbage", NOW), true);
});

test("a session is due once its stamp has passed", () => {
  assert.equal(isRefreshDue(String(NOW + 1), NOW), false);
  assert.equal(isRefreshDue(String(NOW), NOW), true);
  assert.equal(isRefreshDue(String(NOW - HOUR), NOW), true);
});

test("an active user outlasts the token window", () => {
  // Log in, then make a request every 20 minutes for a 10-hour day. Each due
  // request rotates the token and restamps the session; the token must never
  // have run out by the time the next request arrives.
  let now = NOW;
  let expiresAt = inHours(8);
  let stamp = String(refreshAtFor(expiresAt, now));

  for (let step = 0; step < 30; step++) {
    now += 20 * 60 * 1000;
    assert.ok(now < Date.parse(expiresAt), `token expired before request ${step}`);
    if (isRefreshDue(stamp, now)) {
      expiresAt = new Date(now + 8 * HOUR).toISOString();
      stamp = String(refreshAtFor(expiresAt, now));
    }
  }
});
