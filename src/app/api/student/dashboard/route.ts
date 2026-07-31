// src/app/api/student/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSystemConfig } from "@/lib/config";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get("id");

    if (!profileId) {
      return NextResponse.json({ error: "Missing student profile ID" }, { status: 400 });
    }

    // 1. Fetch student details
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId }
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // 2. Fetch history of generated sheets
    const worksheets = await prisma.generatedWorksheet.findMany({
      where: { studentProfileId: profileId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        subject: true,
        topic: true,
        difficulty: true,
        score: true,
        totalMarks: true,
        attemptsJson: true,
        createdAt: true
      }
    });

    // 3. Fetch all weakness and progress logs
    const weaknesses = await prisma.weaknessLog.findMany({
      where: {
        studentProfileId: profileId
      },
      orderBy: [
        { errorCount: "desc" },
        { successCount: "desc" }
      ]
    });

    // 4. Calculate subscription and quota limits
    const contact = (profile.parentPhone || profile.parentEmail || "").trim();
    const sub = contact ? await prisma.parentSubscription.findUnique({ where: { contact } }) : null;
    const tier = sub?.tier || "FREE";

    let generationQuotaReached = false;
    let evaluationQuotaReached = false;

    if (tier === "FREE") {
      const config = await getSystemConfig();
      const dailyLimit = config.tiers.registeredFree.dailyGenerationLimit || 5;
      const monthlyLimit = config.tiers.registeredFree.monthlyGenerationLimit || 150;
      const evalLimit = config.tiers.registeredFree.monthlyDetailedFeedbackQuota || 18;

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Find all profile IDs sharing the same parent contact to prevent rate-limit bypass by creating other children
      let profileIds = [profileId];
      if (contact) {
        const isEmail = contact.includes("@");
        const sharedProfiles = await prisma.studentProfile.findMany({
          where: isEmail 
            ? { parentEmail: { equals: contact, mode: "insensitive" } }
            : { parentPhone: { contains: contact.replace(/\D/g, "").slice(-10) } },
          select: { id: true }
        });
        profileIds = sharedProfiles.map(p => p.id);
      }

      const dailyCount = await prisma.generatedWorksheet.count({
        where: {
          studentProfileId: { in: profileIds },
          createdAt: { gte: oneDayAgo }
        }
      });

      const monthlyCount = await prisma.generatedWorksheet.count({
        where: {
          studentProfileId: { in: profileIds },
          createdAt: { gte: startOfMonth }
        }
      });

      if (dailyCount >= dailyLimit || monthlyCount >= monthlyLimit) {
        generationQuotaReached = true;
      }

      let detailedCount = 0;
      let extraBoosterCredits = 0;
      if (contact) {
        detailedCount = await prisma.evaluationLog.count({
          where: {
            parentContact: contact,
            type: "DETAILED",
            createdAt: { gte: startOfMonth }
          }
        });

        const now = new Date();
        const activeCredits = await prisma.creditPurchase.findMany({
          where: {
            parentContact: contact,
            creditsRemaining: { gt: 0 },
            expiresAt: { gte: now }
          }
        });

        extraBoosterCredits = activeCredits.reduce((sum, pack) => sum + pack.creditsRemaining, 0);

        if (detailedCount >= evalLimit && activeCredits.length === 0) {
          evaluationQuotaReached = true;
        }
      }

      return NextResponse.json({
        profile: {
          id: profile.id,
          name: profile.name,
          grade: profile.grade,
          board: profile.board,
          profileType: profile.profileType || "student",
          parentPin: profile.parentPin,
          parentEmail: profile.parentEmail,
          parentPhone: profile.parentPhone,
          studentPhone: profile.studentPhone,
          username: profile.username,
          password: profile.password,
          securityQuestion: profile.securityQuestion,
          securityAnswer: profile.securityAnswer,
          tier
        },
        worksheets,
        weaknesses,
        generationQuotaReached,
        evaluationQuotaReached,
        quotaDetails: {
          dailyGenerationsUsed: dailyCount,
          dailyGenerationLimit: dailyLimit,
          monthlyEvaluationsUsed: detailedCount,
          monthlyEvaluationLimit: evalLimit,
          extraBoosterCredits,
          generationQuotaReached,
          evaluationQuotaReached
        },
        tier
      });
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        name: profile.name,
        grade: profile.grade,
        board: profile.board,
        profileType: profile.profileType || "student",
        parentPin: profile.parentPin,
        parentEmail: profile.parentEmail,
        parentPhone: profile.parentPhone,
        studentPhone: profile.studentPhone,
        username: profile.username,
        password: profile.password,
        securityQuestion: profile.securityQuestion,
        securityAnswer: profile.securityAnswer,
        tier
      },
      worksheets,
      weaknesses,
      generationQuotaReached: false,
      evaluationQuotaReached: false,
      quotaDetails: {
        dailyGenerationsUsed: 0,
        dailyGenerationLimit: 9999,
        monthlyEvaluationsUsed: 0,
        monthlyEvaluationLimit: 9999,
        extraBoosterCredits: 0,
        generationQuotaReached: false,
        evaluationQuotaReached: false
      },
      tier
    });

  } catch (error) {
    console.error("[Dashboard API Error] Failed to compile dashboard data:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}
