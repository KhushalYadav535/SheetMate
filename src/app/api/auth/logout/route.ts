// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ status: "success", message: "Logged out successfully" });
  return clearSessionCookie(response);
}
