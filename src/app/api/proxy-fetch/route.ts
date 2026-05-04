import { NextResponse } from "next/server";
import { validateExternalUrl } from "@/lib/server/ssrf";
import { getBackendIdentity } from "@/lib/server/auth";

/**
 * Proxy endpoint to fetch external files server-side, bypassing browser CORS.
 * Used by the asset scanner to download files from external origins (e.g. WordPress)
 * before re-uploading them to R2.
 *
 * GET /api/proxy-fetch?url=https://example.com/image.png
 *
 * Hardened: requires authenticated admin session, blocks private IPs / metadata
 * endpoints, http(s) only, response size capped, no upstream redirect following.
 */

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const FETCH_TIMEOUT_MS = 15_000;

export async function GET(request: Request) {
  const identity = await getBackendIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const check = await validateExternalUrl(url);
  if (!check.ok || !check.url) {
    return NextResponse.json(
      { error: "url_rejected", reason: check.reason },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(check.url, {
      redirect: "manual",
      signal: controller.signal,
    });
    if (upstream.status >= 300 && upstream.status < 400) {
      return NextResponse.json({ error: "redirect_blocked" }, { status: 502 });
    }
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: 502 },
      );
    }

    const contentLength = upstream.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": buf.byteLength.toString(),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch upstream" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
