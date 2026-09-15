import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("trizenai_session")?.value;
  const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;

  const isPublicOrAuthPage =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/activate" ||
    pathname === "/password-reset";

  const isProtectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/galleries");

  // 1. Redirect unauthenticated users from protected pages to login
  if (isProtectedPath && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Redirect authenticated users from Home & Auth pages directly to their Dashboard
  if (isPublicOrAuthPage && session) {
    const targetUrl = session.isAdmin
      ? `/dashboard/admin/${session.dashboardToken}`
      : `/dashboard/team`;
    return NextResponse.redirect(new URL(targetUrl, request.url));
  }

  // 3. Redirect /dashboard root
  if (pathname === "/dashboard" && session) {
    const targetUrl = session.isAdmin
      ? `/dashboard/admin/${session.dashboardToken}`
      : `/dashboard/team`;
    return NextResponse.redirect(new URL(targetUrl, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/events/:path*",
    "/galleries/:path*",
    "/login",
    "/register",
    "/activate",
    "/password-reset",
  ],
};
