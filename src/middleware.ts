// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const method = req.method.toUpperCase();

  // Explicitly check public routes
  if (
    pathname === "/api/student/login" ||
    pathname === "/api/parent/otp" ||
    pathname === "/api/student/forgot-username" ||
    pathname === "/api/student/forgot-password" ||
    pathname === "/api/worksheets/generate" ||
    pathname === "/api/chat/extract" ||
    pathname === "/api/config" ||
    pathname === "/api/stats" ||
    pathname === "/api/razorpay/order" ||
    (pathname === "/api/student/profile" && method === "POST") // Public registration
  ) {
    return NextResponse.next();
  }

  // Define protected API routes
  const isProtected =
    pathname.startsWith("/api/student/dashboard") ||
    pathname.startsWith("/api/student/profiles") ||
    pathname.startsWith("/api/parent/summary") ||
    pathname.startsWith("/api/billing") ||
    pathname.startsWith("/api/student/profile") || // PUT, DELETE, GET profile
    (pathname.startsWith("/api/worksheets/") && pathname !== "/api/worksheets/generate"); // /api/worksheets/[id], /review, /grade

  if (isProtected) {
    const token = req.cookies.get("pracup_session")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required. Please log in to access this resource." },
        { status: 401 }
      );
    }

    const session = verifySessionToken(token);
    if (!session) {
      return NextResponse.json(
        { error: "Invalid or expired session. Please log in again." },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/student/dashboard/:path*",
    "/api/student/profiles/:path*",
    "/api/parent/summary/:path*",
    "/api/billing/:path*",
    "/api/student/profile/:path*",
    "/api/worksheets/:path*"
  ]
};
