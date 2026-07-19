// src/app/api/student/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { getSystemConfig } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, grade, board, profileType, parentPin, parentEmail, parentPhone, studentPhone, username, password, securityQuestion, securityAnswer, parentalConsentGiven, tier } = body;

    if (!name || !grade || !board) {
      return NextResponse.json({ error: "Missing name, grade, or board" }, { status: 400 });
    }

    if (!username || !username.trim()) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    // Check username uniqueness
    const existingUsername = await prisma.studentProfile.findUnique({
      where: { username: username.trim() }
    });
    if (existingUsername) {
      return NextResponse.json({ error: "Username is already taken by another student profile." }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      return NextResponse.json({
        error: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
      }, { status: 400 });
    }

    // Fetch dynamic config settings
    const config = await getSystemConfig();

    // Check parental consent if required by config
    if (config.compliance.parentalConsentRequiredAtRegistration && !parentalConsentGiven) {
      return NextResponse.json({ error: "Parental consent is required to register a child profile." }, { status: 400 });
    }

    // Enforce rate limiting and maxChildProfiles by parent contact (phone/email)
    const contact = (parentEmail || parentPhone || "").trim();
    if (contact) {
      const isEmail = contact.includes("@");
      let searchConditions: any[] = [];
      if (isEmail) {
        searchConditions = [{ parentEmail: { equals: contact, mode: "insensitive" } }];
      } else {
        const digits = contact.replace(/\D/g, "");
        if (digits.length >= 10) {
          const localNum = digits.slice(-10);
          searchConditions = [
            { parentPhone: { contains: localNum } },
            { parentPhone: { equals: contact, mode: "insensitive" } }
          ];
        } else if (digits.length > 0) {
          searchConditions = [
            { parentPhone: { contains: digits } },
            { parentPhone: { equals: contact, mode: "insensitive" } }
          ];
        }
      }

      if (searchConditions.length > 0) {
        const existingCount = await prisma.studentProfile.count({
          where: {
            AND: [
              { OR: searchConditions },
              { deletedAt: null }
            ]
          }
        });

        if (existingCount > 0) {
          // Check parent subscription tier to determine max allowed profiles
          const sub = await prisma.parentSubscription.findUnique({
            where: { contact }
          });
          const tier = sub?.tier || "FREE";
          let maxAllowed = 1; // Default for FREE
          if (tier === "PLUS") {
            maxAllowed = config.tiers.plus.maxChildProfiles || 1;
          } else if (tier === "FAMILY_PRO") {
            maxAllowed = config.tiers.familyPro.maxChildProfiles || 5;
          }

          if (existingCount >= maxAllowed) {
            return NextResponse.json(
              {
                error: `This contact is already associated with the maximum number of child profiles for your tier (${maxAllowed}). Please log in to your existing account or upgrade your tier to add more.`
              },
              { status: 400 }
            );
          }
        }
      }
    }

    // Find or create a default global user to hold profiles in MVP
    let defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      defaultUser = await prisma.user.create({
        data: {
          email: "user@practicemitra.in",
          passwordHash: "default-placeholder-hash"
        }
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";

    // Create the student profile linked to this user
    const profile = await prisma.studentProfile.create({
      data: {
        userId: defaultUser.id,
        name,
        grade,
        board,
        profileType: profileType || "student",
        parentPin: parentPin || "0000",
        parentEmail: parentEmail || null,
        parentPhone: parentPhone || null,
        studentPhone: studentPhone || null,
        username: username.trim(),
        password: hashedPassword,
        securityQuestion: securityQuestion || null,
        securityAnswer: securityAnswer || null,
        parentalConsentGiven: !!parentalConsentGiven,
        parentalConsentIp: clientIp,
        parentalConsentDate: parentalConsentGiven ? new Date() : null
      }
    });

    // If a tier is specified and contact details exist, set up the parent subscription
    if (contact && (tier === "FREE" || tier === "PLUS" || tier === "FAMILY_PRO")) {
      const configPrice = tier === "PLUS" ? config.tiers.plus.monthlyPriceINR : (tier === "FAMILY_PRO" ? config.tiers.familyPro.monthlyPriceINR : 0);
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + 30); // 30-day trial/cycle

      await prisma.parentSubscription.upsert({
        where: { contact },
        update: {
          tier,
          status: "ACTIVE",
          billingPriceINR: configPrice,
          endsAt,
          autoRenew: true,
          updatedAt: new Date()
        },
        create: {
          contact,
          tier,
          status: "ACTIVE",
          billingPriceINR: configPrice,
          endsAt,
          autoRenew: true
        }
      });
    }

    return NextResponse.json({
      status: "success",
      profileId: profile.id,
      name: profile.name,
      grade: profile.grade,
      board: profile.board,
      profileType: profile.profileType,
      parentEmail: profile.parentEmail,
      parentPhone: profile.parentPhone,
      studentPhone: profile.studentPhone,
      username: profile.username
    });

  } catch (error) {
    console.error("[Create Profile API Error] Failed to create student profile:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, grade, board, profileType, parentPin, parentEmail, parentPhone, studentPhone, username, password, currentPassword, securityQuestion, securityAnswer, securityAnswerVerification } = body;

    if (!id || !name || !grade || !board) {
      return NextResponse.json({ error: "Missing profile ID, name, grade, or board" }, { status: 400 });
    }

    const existingProfile = await prisma.studentProfile.findUnique({
      where: { id }
    });

    if (!existingProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Validate security verification for recovery detail updates
    const isRecoveryAccount = !!existingProfile.securityQuestion;
    const isSettingUpRecovery = securityQuestion !== undefined && securityQuestion !== null;
    const recoveryFieldsChanging = isRecoveryAccount && (
      (securityQuestion !== undefined && securityQuestion !== existingProfile.securityQuestion) ||
      (securityAnswer !== undefined && securityAnswer !== existingProfile.securityAnswer) ||
      (parentEmail !== undefined && parentEmail !== existingProfile.parentEmail) ||
      (parentPhone !== undefined && parentPhone !== existingProfile.parentPhone)
    );

    if (recoveryFieldsChanging) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required to update recovery details." }, { status: 400 });
      }
      const match = await bcrypt.compare(currentPassword, existingProfile.password);
      if (!match) {
        return NextResponse.json({ error: "Incorrect current password." }, { status: 400 });
      }
      if (!securityAnswerVerification || !securityAnswerVerification.trim()) {
        return NextResponse.json({ error: "Answer to current security question is required to update recovery details." }, { status: 400 });
      }
      if (existingProfile.securityAnswer && securityAnswerVerification.trim().toLowerCase() !== existingProfile.securityAnswer.trim().toLowerCase()) {
        return NextResponse.json({ error: "Incorrect security question answer." }, { status: 400 });
      }
    } else if (isSettingUpRecovery && !isRecoveryAccount) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required to set up recovery details." }, { status: 400 });
      }
      const match = await bcrypt.compare(currentPassword, existingProfile.password);
      if (!match) {
        return NextResponse.json({ error: "Incorrect current password." }, { status: 400 });
      }
    }

    // Check unique username for updates
    if (username !== undefined) {
      if (!username || !username.trim()) {
        return NextResponse.json({ error: "Username is required" }, { status: 400 });
      }
      if (username.trim() !== existingProfile.username) {
        return NextResponse.json({ error: "Username cannot be changed after registration." }, { status: 400 });
      }
    }

    let hashedPasswordToUpdate = undefined;
    if (password !== undefined && password !== null && typeof password === "string" && password.trim() !== "") {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required to change password." }, { status: 400 });
      }
      const match = await bcrypt.compare(currentPassword, existingProfile.password);
      if (!match) {
        return NextResponse.json({ error: "Incorrect current password." }, { status: 400 });
      }
      if (password === currentPassword) {
        return NextResponse.json({ error: "New password cannot be the same as the current password." }, { status: 400 });
      }

      if (password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
      }
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[^A-Za-z0-9]/.test(password);
      if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        return NextResponse.json({
          error: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
        }, { status: 400 });
      }
      hashedPasswordToUpdate = await bcrypt.hash(password, 10);
    }

    const updatedProfile = await prisma.studentProfile.update({
      where: { id },
      data: {
        name,
        grade,
        board,
        profileType: profileType !== undefined ? profileType : existingProfile.profileType,
        parentPin: parentPin || existingProfile.parentPin,
        parentEmail: parentEmail !== undefined ? parentEmail : existingProfile.parentEmail,
        parentPhone: parentPhone !== undefined ? parentPhone : existingProfile.parentPhone,
        studentPhone: studentPhone !== undefined ? studentPhone : existingProfile.studentPhone,
        username: username !== undefined ? username.trim() : existingProfile.username,
        password: hashedPasswordToUpdate !== undefined ? hashedPasswordToUpdate : existingProfile.password,
        securityQuestion: securityQuestion !== undefined ? securityQuestion : existingProfile.securityQuestion,
        securityAnswer: securityAnswer !== undefined ? securityAnswer : existingProfile.securityAnswer
      }
    });

    return NextResponse.json({
      status: "success",
      profileId: updatedProfile.id,
      name: updatedProfile.name,
      grade: updatedProfile.grade,
      board: updatedProfile.board,
      profileType: updatedProfile.profileType,
      studentPhone: updatedProfile.studentPhone,
      username: updatedProfile.username
    });

  } catch (error) {
    console.error("[Update Profile API Error] Failed to update student profile:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, currentPassword, reason, customFeedback } = body;

    if (!id || !currentPassword) {
      return NextResponse.json({ error: "Profile ID and current password are required." }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "Please select a reason for deleting the profile." }, { status: 400 });
    }

    // 1. Fetch the student profile
    const existingProfile = await prisma.studentProfile.findUnique({
      where: { id }
    });

    if (!existingProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // 2. Verify current password
    const match = await bcrypt.compare(currentPassword, existingProfile.password);
    if (!match) {
      return NextResponse.json({ error: "Incorrect password. Account deletion aborted." }, { status: 400 });
    }

    // 3. Create DeletionFeedback log
    const db = prisma as any;
    if (db.deletionFeedback) {
      await db.deletionFeedback.create({
        data: {
          reason: reason.trim(),
          customFeedback: customFeedback ? customFeedback.trim() : null,
          studentName: existingProfile.name,
          username: existingProfile.username,
          grade: existingProfile.grade,
          board: existingProfile.board
        }
      });
    } else {
      console.warn("deletionFeedback table is not available on cached prisma instance. Creating dynamic client fallback...");
      const { PrismaClient } = require("@prisma/client");
      const { PrismaPg } = require("@prisma/adapter-pg");
      const pg = require("pg");
      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL
      });
      const adapter = new PrismaPg(pool);
      const tempPrisma = new PrismaClient({ adapter });
      await tempPrisma.deletionFeedback.create({
        data: {
          reason: reason.trim(),
          customFeedback: customFeedback ? customFeedback.trim() : null,
          studentName: existingProfile.name,
          username: existingProfile.username,
          grade: existingProfile.grade,
          board: existingProfile.board
        }
      });
      await tempPrisma.$disconnect();
      await pool.end();
    }

    // 4. Soft-delete the profile by setting deletedAt to current time for 30-day recovery window
    await prisma.studentProfile.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({
      status: "success",
      message: "Profile and all associated data deleted successfully."
    });

  } catch (error) {
    console.error("[Delete Profile API Error] Failed to delete student profile:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}

