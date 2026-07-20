import { NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * POST /api/auth/login → proxy to Laravel /api/admin/auth/send-code
 * Kept at /login path for backward compatibility with the login page.
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    const response = await fetch(`${API_BASE_URL}/admin/auth/send-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to send code" },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Something went wrong", detail: message },
      { status: 500 }
    );
  }
}
