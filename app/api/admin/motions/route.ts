import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAdminSession } from "@/lib/auth";
import { prisma, ensurePrismaWAL } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function validMaxUsage(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true;
  return (typeof value === "number" || typeof value === "string") &&
    Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 2147483647;
}

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

    return NextResponse.json(
      {
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
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
        },
      }
    );
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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Data mosi tidak valid." }, { status: 400 });
    }
    const bulk = body.motions !== undefined;
    const items = bulk ? body.motions : [body];
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Daftar mosi tidak boleh kosong." }, { status: 400 });
    }

    const records: Prisma.MotionUncheckedCreateInput[] = [];
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (!item || typeof item !== "object" || Array.isArray(item) ||
          typeof item.themeId !== "string" || !item.themeId.trim() ||
          typeof item.motionText !== "string" || !item.motionText.trim()) {
        return NextResponse.json(
          { error: `Mosi ${index + 1}: kategori tema dan teks mosi wajib diisi.` },
          { status: 400 }
        );
      }
      if (!validMaxUsage(item.maxUsage)) {
        return NextResponse.json({ error: `Mosi ${index + 1}: kuota harus bilangan bulat positif atau kosong.` }, { status: 400 });
      }
      if (item.isActive !== undefined && typeof item.isActive !== "boolean") {
        return NextResponse.json({ error: `Mosi ${index + 1}: status mosi tidak valid.` }, { status: 400 });
      }
      records.push({
        themeId: item.themeId,
        motionText: item.motionText.trim(),
        maxUsage: item.maxUsage !== undefined && item.maxUsage !== null && item.maxUsage !== "" ? Number(item.maxUsage) : null,
        usedCount: 0,
        isActive: item.isActive ?? true,
      });
    }

    if (bulk) {
      await prisma.$transaction(async (tx) => {
        for (const data of records) await tx.motion.create({ data });
      });
      return NextResponse.json({ success: true, count: records.length });
    }
    const created = await prisma.motion.create({ data: records[0] });
    return NextResponse.json({ success: true, id: created.id });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json({ error: "Tema tidak ditemukan." }, { status: 400 });
    }
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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Data mosi tidak valid." }, { status: 400 });
    }
    const { id, motionText, maxUsage, isActive, themeId } = body;
    if (typeof id !== "string" || !id.trim()) {
      return NextResponse.json({ error: "ID mosi wajib disertakan." }, { status: 400 });
    }

    const data: {
      motionText?: string;
      maxUsage?: number | null;
      isActive?: boolean;
      themeId?: string;
    } = {};

    if (motionText !== undefined && (typeof motionText !== "string" || !motionText.trim())) {
      return NextResponse.json({ error: "Teks mosi wajib diisi." }, { status: 400 });
    }
    if (themeId !== undefined && (typeof themeId !== "string" || !themeId.trim())) {
      return NextResponse.json({ error: "Kategori tema wajib diisi." }, { status: 400 });
    }
    if (!validMaxUsage(maxUsage)) {
      return NextResponse.json({ error: "Kuota harus bilangan bulat positif atau kosong untuk tanpa batas." }, { status: 400 });
    }
    if (isActive !== undefined && typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Status mosi tidak valid." }, { status: 400 });
    }

    if (motionText !== undefined) data.motionText = motionText.trim();
    if (maxUsage !== undefined) {
      data.maxUsage = maxUsage !== null && maxUsage !== "" ? Number(maxUsage) : null;
    }
    if (isActive !== undefined) data.isActive = isActive;
    if (themeId !== undefined) data.themeId = themeId;

    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.motion.findUniqueOrThrow({ where: { id } });
      const changesResult = (data.motionText !== undefined && data.motionText !== current.motionText) ||
        (data.themeId !== undefined && data.themeId !== current.themeId);
      if (changesResult && await tx.participant.findFirst({
        where: { assignedMotionId: id },
        select: { id: true },
      })) return false;
      await tx.motion.update({ where: { id }, data });
      return true;
    });
    if (!updated) {
      return NextResponse.json(
        { error: "Mosi sudah diundi. Teks dan tema dikunci; kuota dan status masih dapat diubah." },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Mosi tidak ditemukan." }, { status: 404 });
      }
      if (error.code === "P2003") {
        return NextResponse.json({ error: "Tema tidak ditemukan." }, { status: 400 });
      }
    }
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

    if (!id?.trim()) {
      return NextResponse.json({ error: "ID mosi wajib disertakan." }, { status: 400 });
    }

    const deleted = await prisma.$transaction(async (tx) => {
      // Deleting an assigned motion would null out participants' saved results.
      const assigned = await tx.participant.findFirst({
        where: { assignedMotionId: id },
        select: { id: true },
      });
      if (assigned) return false;
      await tx.motion.delete({ where: { id } });
      return true;
    });
    if (!deleted) {
      return NextResponse.json(
        { error: "Mosi sudah diundi. Nonaktifkan mosi agar hasil peserta tetap tersimpan." },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Mosi tidak ditemukan." }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Gagal menghapus mosi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
