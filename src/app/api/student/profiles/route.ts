// src/app/api/student/profiles/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contact = searchParams.get("contact")?.trim();
    const password = searchParams.get("password") || "";

    if (!contact) {
      // Secure default: return an empty list if no query is provided
      return NextResponse.json([]);
    }

    const isEmail = contact.includes("@");
    let searchConditions: any[] = [];

    if (isEmail) {
      searchConditions = [
        { parentEmail: { equals: contact, mode: "insensitive" } }
      ];
    } else {
      // Extract digits to handle formatting differences
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

    // Fetch active and recently soft-deleted profiles associated with the parent's mobile number or email
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

