import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma, ensurePrismaWAL } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await ensurePrismaWAL();
    const session = await getAdminSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const themeId = searchParams.get("themeId");

    const motions = await prisma.motion.findMany({
      where: themeId ? { themeId } : undefined,
      include: { theme: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      motions: motions.map((m) => ({
        id: m.id,
        themeId: m.themeId,
        themeName: m.theme?.name || "Tema",
        motionText: m.motionText,
        maxUsage: m.maxUsage,
        usedCount: m.usedCount,
        isActive: m.isActive,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memuat mosi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensurePrismaWAL();
    const session = await getAdminSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { themeId, motionText, maxUsage, isActive } = await req.json();

    if (!themeId || !motionText) {
      return NextResponse.json(
        { error: "Kategori tema dan teks mosi wajib diisi." },
        { status: 400 }
      );
    }

    const created = await prisma.motion.create({
      data: {
        themeId,
        motionText: String(motionText).trim(),
        maxUsage: maxUsage !== undefined && maxUsage !== null && maxUsage !== "" ? Number(maxUsage) : null,
        usedCount: 0,
        isActive: isActive !== undefined ? !!isActive : true,
      },
    });

    return NextResponse.json({ success: true, id: created.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menambahkan mosi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensurePrismaWAL();
    const session = await getAdminSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, motionText, maxUsage, isActive, themeId } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID mosi wajib disertakan." }, { status: 400 });
    }

    const data: {
      motionText?: string;
      maxUsage?: number | null;
      isActive?: boolean;
      themeId?: string;
    } = {};

    if (motionText !== undefined) data.motionText = String(motionText).trim();
    if (maxUsage !== undefined) {
      data.maxUsage = maxUsage !== null && maxUsage !== "" ? Number(maxUsage) : null;
    }
    if (isActive !== undefined) data.isActive = !!isActive;
    if (themeId !== undefined) data.themeId = themeId;

    await prisma.motion.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui mosi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensurePrismaWAL();
    const session = await getAdminSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID mosi wajib disertakan." }, { status: 400 });
    }

    await prisma.motion.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus mosi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
