import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminSession } from "@/lib/auth";
import { prisma, ensurePrismaWAL } from "@/lib/prisma";
import { SEED_THEMES } from "@/lib/seed-data";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await ensurePrismaWAL();
    const session = await getAdminSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || "admin";
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "generatics2026";
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // 1. Ensure Admin exists
    await prisma.admin.upsert({
      where: { username: adminUsername },
      update: { passwordHash },
      create: {
        username: adminUsername,
        passwordHash,
      },
    });

    // 2. Ensure SystemSetting exists
    await prisma.systemSetting.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        isSpinOpen: false,
        randomMode: "BALANCED",
        prepDurationSeconds: 300,
      },
    });

    // 3. Seed Themes & Motions (without dummy participants)
    let seededThemesCount = 0;
    let seededMotionsCount = 0;

    for (const themeData of SEED_THEMES) {
      let theme = await prisma.theme.findFirst({
        where: { name: themeData.name },
      });

      if (!theme) {
        theme = await prisma.theme.create({
          data: {
            name: themeData.name,
            description: themeData.description,
            isActive: true,
          },
        });
        seededThemesCount++;
      }

      for (const m of themeData.motions) {
        const existing = await prisma.motion.findFirst({
          where: { themeId: theme.id, motionText: m.motionText },
        });

        if (!existing) {
          await prisma.motion.create({
            data: {
              themeId: theme.id,
              motionText: m.motionText,
              maxUsage: m.maxUsage,
              usedCount: 0,
              isActive: true,
            },
          });
          seededMotionsCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Database berhasil diinisialisasi. ${seededThemesCount} tema baru, ${seededMotionsCount} mosi baru.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menginisialisasi database.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
