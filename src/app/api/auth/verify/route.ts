import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const TOKEN_COOKIE = "edu-admin-token";
const USER_COOKIE = "edu-admin-user";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * POST /api/auth/verify → proxy to Laravel /api/admin/auth/verify
 *
 * On success, sets two cookies:
 * - edu-admin-token: Sanctum bearer token (readable by API client)
 * - edu-admin-user: JSON {id, name, email, role} for UI
 */
export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    const response = await fetch(`${API_BASE_URL}/admin/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, code }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Verification failed" },
        { status: response.status }
      );
    }

    // Set cookies with the token and user data
    const cookieStore = await cookies();
    const cookieOptions = {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    };

    // Token cookie — httpOnly so client JS cannot read it; backend calls go through /api/backend.
    cookieStore.set(TOKEN_COOKIE, data.token, {
      ...cookieOptions,
      httpOnly: true,
      sameSite: "strict",
    });

    // User cookie — JSON with user info for UI rendering (no secret material).
    cookieStore.set(USER_COOKIE, JSON.stringify(data.user), {
      ...cookieOptions,
      httpOnly: false,
    });

    return NextResponse.json({ success: true, user: data.user });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Something went wrong", detail: message },
      { status: 500 }
    );
  }
}
