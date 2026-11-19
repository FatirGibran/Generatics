import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminSession } from "@/lib/auth";
import { prisma, ensurePrismaWAL } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return `STR-${code}`;
}

export async function GET(req: NextRequest) {
  try {
    await ensurePrismaWAL();
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const batch = searchParams.get("batch");

    const participants = await prisma.participant.findMany({
      where: batch && batch !== "ALL" ? { sessionBatch: batch } : undefined,
      include: {
        assignedMotion: {
          include: { theme: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      participants: participants.map((p) => ({
        username: p.username,
        fullName: p.fullName,
        accessToken: p.accessToken,
        sessionBatch: p.sessionBatch,
        hasSpun: p.hasSpun,
        assignedMotionId: p.assignedMotionId,
        assignedMotionText: p.assignedMotion?.motionText || null,
        assignedThemeName: p.assignedMotion?.theme?.name || null,
        assignedStance: p.assignedStance,
        spunAt: p.spunAt ? p.spunAt.toISOString() : null,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memuat data peserta.";
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

    const body = await req.json();

    // Bulk import
    if (Array.isArray(body.participants)) {
      let importedCount = 0;

      await prisma.$transaction(async (tx) => {
        for (const item of body.participants) {
          if (!item.username || !item.fullName) continue;
          const cleanUsername = String(item.username).trim();
          const token = item.accessToken ? String(item.accessToken).trim().toUpperCase() : generateToken();

          await tx.participant.upsert({
            where: { username: cleanUsername },
            update: {
              fullName: String(item.fullName).trim(),
              sessionBatch: item.sessionBatch || "Day 1",
            },
            create: {
              username: cleanUsername,
              fullName: String(item.fullName).trim(),
              accessToken: token,
              sessionBatch: item.sessionBatch || "Day 1",
              hasSpun: false,
            },
          });
          importedCount++;
        }
      });

      return NextResponse.json({ success: true, count: importedCount });
    }

    // Single participant creation
    const { username, fullName, accessToken, sessionBatch } = body;
    if (!username || !fullName) {
      return NextResponse.json(
        { error: "Username/NIM dan Nama Lengkap wajib diisi." },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim();
    const token = accessToken ? String(accessToken).trim().toUpperCase() : generateToken();

    const existing = await prisma.participant.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Peserta dengan username/NIM ${cleanUsername} sudah terdaftar.` },
        { status: 400 }
      );
    }

    const created = await prisma.participant.create({
      data: {
        username: cleanUsername,
        fullName: String(fullName).trim(),
        accessToken: token,
        sessionBatch: sessionBatch || "Day 1",
        hasSpun: false,
      },
    });

    return NextResponse.json({
      success: true,
      participant: {
        username: created.username,
        fullName: created.fullName,
        accessToken: created.accessToken,
        sessionBatch: created.sessionBatch,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menambahkan peserta.";
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
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ error: "Username wajib disertakan." }, { status: 400 });
    }

    await prisma.participant.delete({
      where: { username },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus peserta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
