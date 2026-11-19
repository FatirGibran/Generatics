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

    const { name, description, isActive } = await req.json();

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Nama tema wajib diisi." }, { status: 400 });
    }

    const created = await prisma.theme.create({
      data: {
        name: String(name).trim(),
        description: description ? String(description).trim() : "",
        isActive: isActive !== undefined ? !!isActive : true,
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

    const { id, name, description, isActive } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID tema wajib disertakan." }, { status: 400 });
    }

    const data: {
      name?: string;
      description?: string;
      isActive?: boolean;
    } = {};

    if (name !== undefined) data.name = String(name).trim();
    if (description !== undefined) data.description = String(description).trim();
    if (isActive !== undefined) data.isActive = !!isActive;

    await prisma.theme.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
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

    if (!id) {
      return NextResponse.json({ error: "ID tema wajib disertakan." }, { status: 400 });
    }

    await prisma.theme.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus tema.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
