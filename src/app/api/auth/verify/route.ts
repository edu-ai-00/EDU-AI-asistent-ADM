import { NextResponse } from "next/server";
import { writeSessionCookies } from "@/lib/server/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * POST /api/auth/verify → proxy to Laravel /api/admin/auth/verify
 *
 * On success, sets the session cookies (lib/server/auth.ts):
 * - edu-admin-token: Sanctum bearer token (httpOnly, read by the backend proxy)
 * - edu-admin-token-refresh-at: when the proxy should rotate that token
 * - edu-admin-user: JSON {id, name, email, role} for UI
 *
 * All of them live exactly as long as the token, which the API issues for
 * 48 hours (sanctum.admin_expiration_minutes, BR-CAMYRM). A fixed week used to outlive the
 * token by six days, which is the state that let X-Admin-Key answer for the
 * dead token and serve a teacher an admin's data (BR-4U7XUW); the proxy keeps
 * them going while the panel is in use (BR-9SX9BC).
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

    await writeSessionCookies(data, JSON.stringify(data.user));

    return NextResponse.json({ success: true, user: data.user });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Something went wrong", detail: message },
      { status: 500 }
    );
  }
}
