import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username) {
      return NextResponse.json({ error: "Missing student username" }, { status: 400 });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { username: username.trim() }
    });

    if (!profile) {
      return NextResponse.json({ error: "Student username not found." }, { status: 404 });
    }

    // Secure comparison using bcryptjs
    const isPasswordCorrect = await bcrypt.compare(password || "", profile.password);
    if (!isPasswordCorrect) {
      return NextResponse.json({ error: "Incorrect password. Please try again." }, { status: 401 });
    }

    return NextResponse.json({
      status: "success",
      profileId: profile.id,
      name: profile.name,
      grade: profile.grade,
      board: profile.board
    });

  } catch (error) {
    console.error("[Login API Error] Failed to authenticate student profile:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}
