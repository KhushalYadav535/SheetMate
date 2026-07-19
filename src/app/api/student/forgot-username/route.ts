// src/app/api/student/forgot-username/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contact } = body;

    if (!contact || !contact.trim()) {
      return NextResponse.json({ error: "Contact detail is required" }, { status: 400 });
    }

    const queryContact = contact.trim();

    // Query profiles where parentPhone or parentEmail matches
    const profiles = await prisma.studentProfile.findMany({
      where: {
        OR: [
          { parentPhone: queryContact },
          { parentEmail: queryContact }
        ]
      }
    });

    if (profiles.length === 0) {
      return NextResponse.json({
        error: "No student profiles found connected to this parent or recovery contact detail."
      }, { status: 404 });
    }

    const usernames = profiles.map(p => p.username).filter(Boolean) as string[];

    if (usernames.length === 0) {
      return NextResponse.json({
        error: "No usernames configured for the profiles connected to this contact."
      }, { status: 404 });
    }

    // Check if any profile has a security question
    const profileWithQuestion = profiles.find(p => p.securityQuestion && p.securityAnswer);
    const securityQuestion = profileWithQuestion ? profileWithQuestion.securityQuestion : null;

    // Generate simulated 4-digit OTP
    const resetOtp = Math.floor(1000 + Math.random() * 9000).toString();

    return NextResponse.json({
      status: "success",
      otp: resetOtp,
      contact: queryContact,
      securityQuestion,
      message: `[Simulated Notification] Sent verification code ${resetOtp} to registered contact: ${queryContact}`
    });

  } catch (error) {
    console.error("[Forgot Username API POST Error]:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { contact, otp, expectedOtp, securityAnswer } = body;

    if (!contact || !otp || !expectedOtp) {
      return NextResponse.json({ error: "Missing required fields for verification." }, { status: 400 });
    }

    if (otp !== expectedOtp) {
      return NextResponse.json({ error: "Incorrect verification code." }, { status: 400 });
    }

    const queryContact = contact.trim();

    // Query profiles where parentPhone or parentEmail matches
    const profiles = await prisma.studentProfile.findMany({
      where: {
        OR: [
          { parentPhone: queryContact },
          { parentEmail: queryContact }
        ]
      }
    });

    if (profiles.length === 0) {
      return NextResponse.json({
        error: "No student profiles found connected to this parent or recovery contact detail."
      }, { status: 404 });
    }

    let validatedUsernames: string[] = [];
    let checkedAnySecurity = false;
    let passedAnySecurity = false;

    for (const profile of profiles) {
      if (profile.securityQuestion && profile.securityAnswer) {
        checkedAnySecurity = true;
        if (securityAnswer && securityAnswer.trim().toLowerCase() === profile.securityAnswer.trim().toLowerCase()) {
          passedAnySecurity = true;
          if (profile.username) {
            validatedUsernames.push(profile.username);
          }
        }
      } else {
        if (profile.username) {
          validatedUsernames.push(profile.username);
        }
      }
    }

    if (checkedAnySecurity && !passedAnySecurity) {
      return NextResponse.json({ error: "Incorrect security question answer." }, { status: 400 });
    }

    if (validatedUsernames.length === 0) {
      return NextResponse.json({
        error: "No usernames recovered after security verification."
      }, { status: 400 });
    }

    return NextResponse.json({
      status: "success",
      usernames: validatedUsernames
    });

  } catch (error) {
    console.error("[Forgot Username API PUT Error]:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}
