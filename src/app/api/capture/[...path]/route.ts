import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/server/auth";

/**
 * Unauthenticated proxy for the phone capture page (BR-D4PE8R).
 *
 * The phone that scans the QR code has no admin session, so it cannot use
 * /api/backend. This route forwards to exactly two upstream endpoints and
 * nothing else — the session token in the path is the only credential, and the
 * API validates it (hash, expiry, per-session scope, rate limit).
 *
 * Unlike /api/backend it never attaches the admin key or a bearer token.
 */

// Str::random(48) on the API side; keep the check loose but non-empty.
const TOKEN_PATTERN = /^[A-Za-z0-9]{16,128}$/;

const HOP_BY_HOP_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "cookie",
  "authorization",
  "x-admin-key",
]);

const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "set-cookie",
]);

function resolveUpstream(segments: string[], method: string): string | null {
  const [token, action, ...rest] = segments;

  if (!token || !TOKEN_PATTERN.test(token) || rest.length > 0) return null;

  if (method === "GET" && action === undefined) {
    return `${API_BASE_URL}/generation/capture/${token}`;
  }

  if (method === "POST" && action === "attachments") {
    return `${API_BASE_URL}/generation/capture/${token}/attachments`;
  }

  return null;
}

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const upstreamUrl = resolveUpstream(path ?? [], req.method);

  if (!upstreamUrl) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  headers.set("Accept", "application/json");

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: req.method === "POST" ? await req.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Bad gateway" }, { status: 502 });
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = handle;
export const POST = handle;
