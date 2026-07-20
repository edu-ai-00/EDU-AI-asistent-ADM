import { NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * POST /api/auth/send-code → proxy to Laravel /api/admin/auth/send-code
 */
export async function POST(request: Request) {
  const url = `${API_BASE_URL}/admin/auth/send-code`;
  try {
    const { email } = await request.json();

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email }),
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = (await response.text()).slice(0, 200);
      return NextResponse.json(
        { error: "API returned non-JSON", detail: { url, status: response.status, contentType, body: text } },
        { status: 502 }
      );
    }

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
      { error: "Something went wrong", detail: { message, url } },
      { status: 500 }
    );
  }
}
