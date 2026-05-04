import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TOKEN_COOKIE = "edu-admin-token";

function isAuthenticated(request: NextRequest): boolean {
  const tokenCookie = request.cookies.get(TOKEN_COOKIE);
  return Boolean(tokenCookie?.value);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated(request)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === "/login") {
    if (isAuthenticated(request)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
