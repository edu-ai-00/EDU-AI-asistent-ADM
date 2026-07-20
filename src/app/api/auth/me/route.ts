import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const TOKEN_COOKIE = "edu-admin-token";

/**
 * GET /api/auth/me → proxy to Laravel /api/admin/auth/me
 *
 * Validates the current session by checking the Sanctum token.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const response = await fetch(`${API_BASE_URL}/admin/auth/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Something went wrong", detail: message }, { status: 500 });
  }
}
