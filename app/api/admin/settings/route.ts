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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Data pengaturan tidak valid." }, { status: 400 });
    }
    const updateData: {
      isSpinOpen?: boolean;
      randomMode?: string;
      prepDurationSeconds?: number;
    } = {};

    if (body.isSpinOpen !== undefined) {
      if (typeof body.isSpinOpen !== "boolean") {
        return NextResponse.json({ error: "Status akses spin harus boolean." }, { status: 400 });
      }
      updateData.isSpinOpen = body.isSpinOpen;
    }
    if (body.randomMode !== undefined) {
      const mode = body.randomMode;
      if (mode !== "BALANCED" && mode !== "PURE_RANDOM") {
        return NextResponse.json({ error: "Mode pengacakan tidak valid." }, { status: 400 });
      }
      updateData.randomMode = mode;
    }
    if (body.prepDurationSeconds !== undefined) {
      const sec = body.prepDurationSeconds;
      if (typeof sec !== "number" || !Number.isInteger(sec) || sec < 30 || sec > 7200) {
        return NextResponse.json({ error: "Durasi persiapan harus 30–7200 detik (bilangan bulat)." }, { status: 400 });
      }
      updateData.prepDurationSeconds = sec;
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
