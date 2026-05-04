import { NextRequest, NextResponse } from "next/server";
import {
  API_BASE_URL,
  buildBackendHeaders,
  getServerToken,
} from "@/lib/server/auth";

/**
 * Authenticated server-side proxy to the Laravel backend.
 *
 * Reads the httpOnly Sanctum token cookie, injects it as Bearer, forwards the
 * request to the upstream API, and streams the response back to the browser.
 * This lets the admin UI keep the token httpOnly while still calling backend
 * endpoints from React components.
 *
 * Mounted at /api/backend/* — `lib/api/client.ts` uses this as its base URL.
 */

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

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const token = await getServerToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  const { path } = await ctx.params;
  const segments = (path ?? []).map((p) => encodeURIComponent(p)).join("/");
  if (!segments) {
    return NextResponse.json({ message: "Missing path" }, { status: 400 });
  }

  const url = new URL(req.url);
  const upstreamUrl = `${API_BASE_URL}/${segments}${url.search}`;

  const headers = buildBackendHeaders(token);
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  let body: BodyInit | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body,
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
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
