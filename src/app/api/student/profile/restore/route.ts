// src/app/api/student/profile/restore/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, password } = body;

    if (!id) {
      return NextResponse.json({ error: "Profile ID is required." }, { status: 400 });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { id }
    });

    if (!profile) {
      return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    }

    // Only enforce password verification if a password was supplied in the request.
    // This allows parents already verified via OTP to restore profiles without needing the child's password.
    if (password) {
      const match = await bcrypt.compare(password, profile.password);
      if (!match) {
        return NextResponse.json({ error: "Incorrect password. Cannot restore profile." }, { status: 400 });
      }
    }

    // Restore the account by clearing the deletedAt field
    await prisma.studentProfile.update({
      where: { id },
      data: { deletedAt: null }
    });

    // Clean up DeletionFeedback records for this profile so restored accounts don't skew churn analytics
    if (profile.username) {
      await prisma.deletionFeedback.deleteMany({
        where: { username: profile.username }
      });
    }

    return NextResponse.json({
      status: "success",
      message: "Profile has been successfully restored."
    });

  } catch (error) {
    console.error("[Restore Profile API Error] Failed to restore profile:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}
