// src/app/api/student/profiles/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate caller session
    const session = await getSession(req);
    if (!session || !session.parentContact) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // 2. IGNORE client-supplied `contact` query parameter.
    // Use verified session parentContact directly as absolute ground truth:
    const contact = session.parentContact.trim();
    const isEmail = contact.includes("@");
    let searchConditions: any[] = [];

    if (isEmail) {
      searchConditions = [
        { parentEmail: { equals: contact, mode: "insensitive" } }
      ];
    } else {
      const digits = contact.replace(/\D/g, "");
      if (digits.length >= 10) {
        const localNum = digits.slice(-10);
        searchConditions = [
          { parentPhone: { contains: localNum } },
          { parentPhone: { equals: contact, mode: "insensitive" } },
          { parentEmail: { equals: contact, mode: "insensitive" } }
        ];
      } else if (digits.length > 0) {
        searchConditions = [
          { parentPhone: { contains: digits } },
          { parentPhone: { equals: contact, mode: "insensitive" } },
          { parentEmail: { equals: contact, mode: "insensitive" } }
        ];
      } else {
        searchConditions = [
          { parentPhone: { equals: contact, mode: "insensitive" } },
          { parentEmail: { equals: contact, mode: "insensitive" } }
        ];
      }
    }

    // Fetch active and recently soft-deleted profiles associated strictly with the verified session parent contact
    const profiles = await prisma.studentProfile.findMany({
      where: {
        AND: [
          {
            OR: searchConditions
          },
          {
            OR: [
              { deletedAt: null },
              { deletedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
            ]
          }
        ]
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        grade: true,
        board: true,
        deletedAt: true
      }
    });

    return NextResponse.json(profiles);

  } catch (error) {
    console.error("[Get Profiles API Error] Failed to retrieve profiles list:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}
