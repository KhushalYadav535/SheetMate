// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ authenticated: false, profile: null }, { status: 401 });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { id: session.profileId },
      select: {
        id: true,
        name: true,
        grade: true,
        board: true,
        profileType: true,
        parentPhone: true,
        parentEmail: true,
        username: true
      }
    });

    if (!profile) {
      return NextResponse.json({ authenticated: false, profile: null }, { status: 404 });
    }

    return NextResponse.json({
      authenticated: true,
      profile: {
        ...profile,
        parentContact: session.parentContact
      }
    });
  } catch (error) {
    console.error("[Auth Me Error]:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}
