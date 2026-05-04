import { cookies } from "next/headers";

export const TOKEN_COOKIE = "edu-admin-token";
export const USER_COOKIE = "edu-admin-user";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://app-api.edu-ai.eu/api";

// Server-only — never reference NEXT_PUBLIC_* here; that would leak the key
// into the client bundle.
const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "";

export async function getServerToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value ?? null;
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
