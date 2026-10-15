import { cookies } from "next/headers";
import { cookieMaxAge, isRefreshDue, refreshAtFor } from "@/lib/auth/session-refresh";

export const TOKEN_COOKIE = "edu-admin-token";
export const USER_COOKIE = "edu-admin-user";
/** Epoch ms after which the token is rotated — see lib/auth/session-refresh.ts. */
export const REFRESH_AT_COOKIE = "edu-admin-token-refresh-at";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://app-api.edu-ai.eu/api";

// Server-only — never reference NEXT_PUBLIC_* here; that would leak the key
// into the client bundle.
const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "";

export async function getServerToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value ?? null;
}

interface IssuedToken {
  token: string;
  expires_at?: string;
}

/**
 * Write the session cookies for a token the API just issued. Every cookie
 * lives exactly as long as the token (BR-4U7XUW); `user` is the
 * `edu-admin-user` JSON, re-set so it does not expire before the token does.
 */
export async function writeSessionCookies(issued: IssuedToken, user?: string): Promise<void> {
  const store = await cookies();
  const options = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: cookieMaxAge(issued.expires_at),
    path: "/",
  };

  // Token cookie — httpOnly so client JS cannot read it; backend calls go through /api/backend.
  store.set(TOKEN_COOKIE, issued.token, { ...options, httpOnly: true, sameSite: "strict" });
  store.set(REFRESH_AT_COOKIE, String(refreshAtFor(issued.expires_at)), {
    ...options,
    httpOnly: true,
    sameSite: "strict",
  });

  // User cookie — JSON with user info for UI rendering (no secret material).
  if (user) store.set(USER_COOKIE, user, { ...options, httpOnly: false });
}

// Rotations in flight, keyed by the token being rotated out. The panel fires
// several backend calls at once, and they all find the token due together;
// they share one refresh instead of each minting a token of its own.
const rotations = new Map<string, Promise<IssuedToken | null>>();

async function rotate(token: string): Promise<IssuedToken | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/auth/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<IssuedToken>;
    return typeof json.token === "string" ? { token: json.token, expires_at: json.expires_at } : null;
  } catch {
    return null;
  }
}

/**
 * The session token for a backend call, rotated first when it is due.
 *
 * Admin tokens die 48 hours after they are issued and the cookies with them,
 * so without this a session ended a fixed time after login however busy the
 * user was (BR-9SX9BC). Rotating while the panel is in use makes that 48 hours
 * of inactivity instead (BR-CAMYRM). A failed rotation keeps the current token: if it is
 * still alive the call goes through and the next one retries, and if it is
 * dead the API's 401 logs the user out as before.
 */
export async function getFreshServerToken(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value ?? null;
  if (!token || !isRefreshDue(store.get(REFRESH_AT_COOKIE)?.value)) return token;

  let rotation = rotations.get(token);
  if (!rotation) {
    rotation = rotate(token).finally(() => rotations.delete(token));
    rotations.set(token, rotation);
  }

  const issued = await rotation;
  if (!issued) return token;

  await writeSessionCookies(issued, store.get(USER_COOKIE)?.value);
  return issued.token;
}

export interface BackendIdentity {
  id: number;
  name: string;
  email: string;
  role: string;
}

/**
 * Verify the current session against the backend and return the identity.
 * Returns null if unauthenticated or session invalid.
 */
export async function getBackendIdentity(): Promise<BackendIdentity | null> {
  const token = await getServerToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/admin/auth/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: BackendIdentity };
    return json.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Build the Authorization + admin-key headers used for proxied backend calls.
 */
export function buildBackendHeaders(token: string, extra: HeadersInit = {}): Headers {
  const headers = new Headers(extra);
  headers.set("Authorization", `Bearer ${token}`);
  if (ADMIN_API_KEY) headers.set("X-Admin-Key", ADMIN_API_KEY);
  return headers;
}
