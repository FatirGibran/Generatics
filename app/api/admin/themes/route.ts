import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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

    const themes = await prisma.theme.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      {
        themes: themes.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description || "",
          isActive: t.isActive,
          createdAt: t.createdAt.toISOString(),
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
    const message = error instanceof Error ? error.message : "Gagal memuat tema.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensurePrismaWAL();
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Data tema tidak valid." }, { status: 400 });
    }
    const { name, description, isActive } = body;

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nama tema wajib diisi." }, { status: 400 });
    }

    if ((description !== undefined && description !== null && typeof description !== "string") ||
        (isActive !== undefined && typeof isActive !== "boolean")) {
      return NextResponse.json({ error: "Deskripsi atau status tema tidak valid." }, { status: 400 });
    }

    const created = await prisma.theme.create({
      data: {
        name: name.trim(),
        description: description?.trim() ?? "",
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, id: created.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menambahkan tema.";
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
      return NextResponse.json({ error: "Data tema tidak valid." }, { status: 400 });
    }
    const { id, name, description, isActive } = body;
    if (typeof id !== "string" || !id.trim()) {
      return NextResponse.json({ error: "ID tema wajib disertakan." }, { status: 400 });
    }

    const data: {
      name?: string;
      description?: string;
      isActive?: boolean;
    } = {};

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return NextResponse.json({ error: "Nama tema wajib diisi." }, { status: 400 });
    }
    if ((description !== undefined && description !== null && typeof description !== "string") ||
        (isActive !== undefined && typeof isActive !== "boolean")) {
      return NextResponse.json({ error: "Deskripsi atau status tema tidak valid." }, { status: 400 });
    }
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description?.trim() ?? "";
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.theme.findUniqueOrThrow({ where: { id } });
      if (data.name !== undefined && data.name !== current.name && await tx.participant.findFirst({
        where: { assignedMotion: { themeId: id } },
        select: { id: true },
      })) return false;
      await tx.theme.update({ where: { id }, data });
      return true;
    });
    if (!updated) {
      return NextResponse.json(
        { error: "Tema sudah diundi. Nama dikunci; deskripsi dan status masih dapat diubah." },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Tema tidak ditemukan." }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Gagal memperbarui tema.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensurePrismaWAL();
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id?.trim()) {
      return NextResponse.json({ error: "ID tema wajib disertakan." }, { status: 400 });
    }

    const deleted = await prisma.$transaction(async (tx) => {
      // Assigned results are live joins; cascading deletion would erase them.
      const assigned = await tx.participant.findFirst({
        where: { assignedMotion: { themeId: id } },
        select: { id: true },
      });
      if (assigned) return false;
      await tx.theme.delete({ where: { id } });
      return true;
    });
    if (!deleted) {
      return NextResponse.json(
        { error: "Tema memiliki mosi yang sudah diundi. Nonaktifkan tema agar hasil peserta tetap tersimpan." },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Tema tidak ditemukan." }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Gagal menghapus tema.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
