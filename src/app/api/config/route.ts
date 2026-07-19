// src/app/api/config/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSystemConfig, clearConfigCache, DEFAULT_CONFIG } from "@/lib/config";

export async function GET(req: NextRequest) {
  try {
    const config = await getSystemConfig();
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load config" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const currentConfig = await getSystemConfig();

    // Compute diff/changes
    const changes: Record<string, { old: any; new: any }> = {};
    const keys = Array.from(new Set([...Object.keys(currentConfig), ...Object.keys(body)]));

    for (const key of keys) {
      const oldVal = (currentConfig as any)[key];
      const newVal = body[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[key] = { old: oldVal, new: newVal };
      }
    }

    // Determine new version
    const versionParts = currentConfig.configVersion.split(".");
    const patchVersion = parseInt(versionParts[2] || "0") + 1;
    const newVersion = `${versionParts[0]}.${versionParts[1]}.${patchVersion}`;

    const newConfigData = {
      ...body,
      configVersion: newVersion
    };

    // Update DB
    await prisma.$transaction(async (tx) => {
      // Update system config
      await tx.systemConfig.upsert({
        where: { id: "active_config" },
        update: {
          version: newVersion,
          configJson: JSON.stringify(newConfigData)
        },
        create: {
          id: "active_config",
          version: newVersion,
          configJson: JSON.stringify(newConfigData)
        }
      });

      // Write audit log entry
      await tx.systemConfigHistory.create({
        data: {
          version: newVersion,
          changedBy: "ADMIN",
          configJson: JSON.stringify(newConfigData),
          diffJson: JSON.stringify(changes)
        }
      });
    });

    // Reset caching
    clearConfigCache();

    return NextResponse.json({
      status: "success",
      version: newVersion,
      changes
    });
  } catch (error) {
    console.error("Failed to update config:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to update config" },
      { status: 500 }
    );
  }
}
