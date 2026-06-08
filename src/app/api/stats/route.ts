// src/app/api/stats/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic"; // always fresh

export async function GET() {
  try {
    // Total worksheets generated (all-time, including guests)
    const totalWorksheets = await db.generatedWorksheet.count();

    // Graded worksheets (score is not null)
    const gradedWorksheets = await db.generatedWorksheet.findMany({
      where: {
        score: { not: null },
        totalMarks: { gt: 0 },
      },
      select: { score: true, totalMarks: true },
    });

    // Calculate real average accuracy
    let avgAccuracy = 0;
    if (gradedWorksheets.length > 0) {
      const totalPct = gradedWorksheets.reduce((sum, ws) => {
        return sum + ((ws.score! / ws.totalMarks) * 100);
      }, 0);
      avgAccuracy = Math.round(totalPct / gradedWorksheets.length);
    }

    // Count distinct active student profiles
    const profileCount = await db.studentProfile.count();

    return NextResponse.json({
      worksheets: totalWorksheets,
      profiles: profileCount,
      subjects: 6,       // Fixed: MATH, SCIENCE, ENGLISH, EVS, HINDI, SST
      gradeLevels: 10,   // Fixed: LKG, UKG, Class 1–8
      avgAccuracy: avgAccuracy > 0 ? avgAccuracy : null,
    });
  } catch (err) {
    console.error("[/api/stats] Error:", err);
    return NextResponse.json(
      { worksheets: 0, profiles: 0, subjects: 6, gradeLevels: 10, avgAccuracy: null },
      { status: 500 }
    );
  }
}
