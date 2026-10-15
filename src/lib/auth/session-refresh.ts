// When the admin session's Sanctum token gets rotated (BR-9SX9BC).
//
// The API issues admin/teacher tokens for 48 hours (sanctum.admin_expiration_minutes,
// 8 hours before BR-CAMYRM) and the panel's cookies live exactly as long
// (BR-4U7XUW). Nothing used to refresh them, so every session ended a fixed
// time after login however busy the user was. The backend proxy now rotates the
// token through POST /admin/auth/refresh once it has been in use for a while,
// which turns that fixed window into 48 hours of inactivity.
//
// Pure timing only — the cookie writes live in lib/server/auth.ts.

/** Cookie lifetime when the API gave no usable expiry, and the cap on it. */
export const SESSION_COOKIE_FALLBACK_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** Rotate the token at most this often while the panel is in use. */
export const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

function expiryMs(expiresAt: unknown): number {
  return typeof expiresAt === "string" ? new Date(expiresAt).getTime() : NaN;
}

/** Seconds the session cookies may live: exactly as long as the token. */
export function cookieMaxAge(expiresAt: unknown, now = Date.now()): number {
  const seconds = Math.floor((expiryMs(expiresAt) - now) / 1000);
  if (!Number.isFinite(seconds) || seconds <= 0) return SESSION_COOKIE_FALLBACK_MAX_AGE;

  return Math.min(seconds, SESSION_COOKIE_FALLBACK_MAX_AGE);
}

/**
 * When a token issued now should next be rotated (epoch ms): after the refresh
 * interval, or halfway through its life if it is shorter than that — so it is
 * always refreshed with time to spare, whatever window the API is set to.
 */
export function refreshAtFor(expiresAt: unknown, now = Date.now()): number {
  const lifetime = expiryMs(expiresAt) - now;
  if (!Number.isFinite(lifetime) || lifetime <= 0) return now + REFRESH_INTERVAL_MS;

  return now + Math.min(REFRESH_INTERVAL_MS, Math.floor(lifetime / 2));
}

/**
 * Whether the token must be rotated before the next backend call. A session
 * with no stamp — one that logged in before the stamp existed — is due at once.
 */
export function isRefreshDue(stamp: string | undefined, now = Date.now()): boolean {
  if (!stamp) return true;

  const refreshAt = Number(stamp);
  return !Number.isFinite(refreshAt) || now >= refreshAt;
}
