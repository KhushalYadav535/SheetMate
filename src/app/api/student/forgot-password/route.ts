// src/app/api/student/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username } = body;

    if (!username || !username.trim()) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { username: username.trim() }
    });

    if (!profile) {
      return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    }

    const hasPhone = !!profile.parentPhone;
    const hasEmail = !!profile.parentEmail;

    if (!hasPhone && !hasEmail) {
      return NextResponse.json({
        error: "Cannot recover password. No parent or recovery contact details were connected to this profile at registration."
      }, { status: 400 });
    }

    // Generate simulated 4-digit reset OTP
    const resetOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const targetContact = profile.parentPhone || profile.parentEmail;
    
    return NextResponse.json({
      status: "success",
      otp: resetOtp,
      parentPhone: profile.parentPhone,
      parentEmail: profile.parentEmail,
      securityQuestion: profile.securityQuestion,
      message: `[Simulated Notification] Sent reset verification code ${resetOtp} to registered contact: ${targetContact}`
    });

  } catch (error) {
    console.error("[Forgot Password API POST Error]:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, newPassword, otp, expectedOtp, securityAnswer } = body;

    if (!username || !newPassword || !otp || !expectedOtp) {
      return NextResponse.json({ error: "Missing required fields for reset." }, { status: 400 });
    }

    if (otp !== expectedOtp) {
      return NextResponse.json({ error: "Incorrect verification code." }, { status: 400 });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { username: username.trim() }
    });

    if (!profile) {
      return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    }

    const isSamePassword = await bcrypt.compare(newPassword, profile.password);
    if (isSamePassword) {
      return NextResponse.json({ error: "New password cannot be the same as your current password." }, { status: 400 });
    }

    // Verify security question if configured on profile
    if (profile.securityQuestion) {
      if (!securityAnswer || !securityAnswer.trim()) {
        return NextResponse.json({ error: "Answer to security question is required." }, { status: 400 });
      }
      if (profile.securityAnswer && securityAnswer.trim().toLowerCase() !== profile.securityAnswer.trim().toLowerCase()) {
        return NextResponse.json({ error: "Incorrect security question answer." }, { status: 400 });
      }
    }

    // Verify password strength
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      return NextResponse.json({
        error: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
      }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.studentProfile.update({
      where: { id: profile.id },
      data: { password: hashedPassword }
    });

    return NextResponse.json({
      status: "success",
      message: "Password updated successfully!"
    });

  } catch (error) {
    console.error("[Forgot Password API PUT Error]:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}
