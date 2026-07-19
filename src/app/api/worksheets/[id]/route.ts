// src/app/api/worksheets/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const worksheet = await prisma.generatedWorksheet.findUnique({
      where: { id }
    });

    if (!worksheet) {
      return NextResponse.json({ error: "Worksheet not found" }, { status: 404 });
    }

    const data = JSON.parse(worksheet.contentJson);
    const keyIncluded = data.includeAnswerKey !== false;

    // Dynamically strip answer keys & explanations for guest users or when includeAnswerKey is false.
    if (!worksheet.studentProfileId) {
      if (data.sections && Array.isArray(data.sections)) {
        for (const sec of data.sections) {
          if (sec.questions && Array.isArray(sec.questions)) {
            for (const q of sec.questions) {
              q.answer = "";
              q.solutionExplanation = "";
            }
          }
        }
      }
      if (data.activities && Array.isArray(data.activities)) {
        for (const act of data.activities) {
          if (act.questions && Array.isArray(act.questions)) {
            for (const q of act.questions) {
              q.answer = "";
              q.explanation = "";
            }
          }
          if (act.items && Array.isArray(act.items)) {
            for (const item of act.items) {
              item.right = "";
            }
          }
        }
      }
    }

    return NextResponse.json({
      id: worksheet.id,
      studentProfileId: worksheet.studentProfileId,
      subject: worksheet.subject,
      topic: worksheet.topic,
      difficulty: worksheet.difficulty,
      totalMarks: worksheet.totalMarks,
      score: worksheet.score,
      attemptsJson: worksheet.attemptsJson,
      createdAt: worksheet.createdAt,
      data
    });

  } catch (error) {
    console.error("[Get Worksheet API Error] Failed to fetch worksheet:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the worksheet first to identify the student profile and subtopics
    const worksheet = await prisma.generatedWorksheet.findUnique({
      where: { id }
    });

    if (worksheet) {
      if (worksheet.studentProfileId) {
        const subtopics = getWorksheetSubtopics(worksheet.contentJson, worksheet.topic);
        if (subtopics.length > 0) {
          // Delete weakness logs corresponding to these concepts for this student
          await prisma.weaknessLog.deleteMany({
            where: {
              studentProfileId: worksheet.studentProfileId,
              subject: worksheet.subject,
              topic: worksheet.topic,
              subtopic: { in: subtopics }
            }
          });
        }
      }

      await prisma.generatedWorksheet.delete({
        where: { id }
      });
    } else {
      return NextResponse.json({ error: "Worksheet not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: "success",
      message: "Worksheet deleted successfully and associated concepts removed from weakness logs."
    });

  } catch (error) {
    console.error("[Delete Worksheet API Error] Failed to delete worksheet:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}

// Helper to extract all unique subtopics from the worksheet JSON
function getWorksheetSubtopics(contentJsonStr: string, topic: string): string[] {
  const subtopics = new Set<string>();

  // Add the base topic
  subtopics.add(topic);

  try {
    const data = JSON.parse(contentJsonStr);

    if (data.activities && Array.isArray(data.activities)) {
      for (const act of data.activities) {
        if (act.type) {
          const actTypeLabel = act.type === "MATCHING" ? "Matching" : act.type === "FILL_BLANKS" ? "Fill Blanks" : "Odd Out";
          subtopics.add(`${topic} (${actTypeLabel})`);
        }
      }
    }

    if (data.sections && Array.isArray(data.sections)) {
      for (const sec of data.sections) {
        if (sec.questions && Array.isArray(sec.questions)) {
          for (const q of sec.questions) {
            if (q.subtopic) {
              subtopics.add(q.subtopic);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed to parse worksheet content JSON for subtopics:", err);
  }

  return Array.from(subtopics);
}

