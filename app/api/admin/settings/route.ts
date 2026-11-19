import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma, ensurePrismaWAL } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensurePrismaWAL();
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { id: 1 },
    });

    const data = setting || {
      id: 1,
      isSpinOpen: false,
      randomMode: "BALANCED",
      prepDurationSeconds: 300,
    };

    return NextResponse.json(
      {
        settings: {
          isSpinOpen: data.isSpinOpen,
          randomMode: data.randomMode,
          prepDurationSeconds: data.prepDurationSeconds,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memuat pengaturan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensurePrismaWAL();
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const updateData: {
      isSpinOpen?: boolean;
      randomMode?: string;
      prepDurationSeconds?: number;
    } = {};

    if (body.isSpinOpen !== undefined) updateData.isSpinOpen = Boolean(body.isSpinOpen);
    if (body.randomMode !== undefined) {
      const mode = String(body.randomMode).trim();
      if (mode === "BALANCED" || mode === "PURE_RANDOM") {
        updateData.randomMode = mode;
      }
    }
    if (body.prepDurationSeconds !== undefined) {
      const sec = Number(body.prepDurationSeconds);
      if (Number.isFinite(sec) && sec >= 30 && sec <= 7200) {
        updateData.prepDurationSeconds = Math.round(sec);
      }
    }

    const setting = await prisma.systemSetting.upsert({
      where: { id: 1 },
      update: updateData,
      create: {
        id: 1,
        isSpinOpen: updateData.isSpinOpen ?? false,
        randomMode: updateData.randomMode ?? "BALANCED",
        prepDurationSeconds: updateData.prepDurationSeconds ?? 300,
      },
    });

    return NextResponse.json({
      success: true,
      settings: {
        isSpinOpen: setting.isSpinOpen,
        randomMode: setting.randomMode,
        prepDurationSeconds: setting.prepDurationSeconds,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui pengaturan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
