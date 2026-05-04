import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://app-api.edu-ai.eu/api";

const TOKEN_COOKIE = "edu-admin-token";
const USER_COOKIE = "edu-admin-user";
// Legacy cookie from password-based auth
const LEGACY_COOKIE = "edu-admin-auth";

/**
 * POST /api/auth/logout → revoke Sanctum token + clear cookies
 */
export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;

  // Try to revoke the Sanctum token on the server
  if (token) {
    try {
      await fetch(`${API_BASE_URL}/admin/auth/logout`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Ignore errors — we clear cookies regardless
    }
  }

  // Clear all auth cookies
  cookieStore.delete(TOKEN_COOKIE);
  cookieStore.delete(USER_COOKIE);
  cookieStore.delete(LEGACY_COOKIE);

  return NextResponse.json({ success: true });
}
