import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { ParticipantInputError, validateParticipant, validateParticipantBatch } from "@/lib/participant-import";
import { getAdminSession } from "@/lib/auth";
import { prisma, ensurePrismaWAL } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function generateRawToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return `STR-${code}`;
}

async function getUniqueToken(tx: Prisma.TransactionClient, customToken?: string): Promise<string> {
  if (customToken) return customToken;
  for (let i = 0; i < 32; i++) {
    const candidate = generateRawToken();
    const existing = await tx.participant.findUnique({ where: { accessToken: candidate } });
    if (!existing) return candidate;
  }
  throw new Error("Gagal membuat token unik. Silakan coba lagi.");
}

function errorResponse(error: unknown, fallback: string, row?: number) {
  let status = 500;
  let message = fallback;
  if (error instanceof SyntaxError) {
    status = 400;
    message = "JSON tidak valid.";
  } else if (error instanceof ParticipantInputError) {
    status = error.status;
    message = error.message;
    row = error.row ?? row;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      status = 409;
      message = String(error.meta?.target).toLowerCase().includes("accesstoken")
        ? "Token sudah digunakan oleh peserta lain. Gunakan token berbeda."
        : "Username/NIM sudah terdaftar. Gunakan username/NIM berbeda.";
    } else if (error.code === "P2025") {
      status = 404;
      message = "Peserta tidak ditemukan.";
    }
  }
  if (row !== undefined && !(error instanceof ParticipantInputError && error.row !== undefined)) {
    message = `Baris ${row}: ${message}`;
  }
  return NextResponse.json({ error: message, ...(row !== undefined ? { row } : {}) }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const batch = searchParams.get("batch");
    if (batch && !["ALL", "Day 1", "Day 2"].includes(batch)) {
      return NextResponse.json({ error: "Sesi wajib Day 1 atau Day 2." }, { status: 400 });
    }
    await ensurePrismaWAL();

    const participants = await prisma.participant.findMany({
      where: batch && batch !== "ALL" ? { sessionBatch: batch } : undefined,
      include: {
        assignedMotion: {
          include: { theme: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      {
        participants: participants.map((p) => ({
          username: p.username,
          fullName: p.fullName,
          accessToken: p.accessToken,
          sessionBatch: p.sessionBatch,
          hasSpun: Boolean(p.hasSpun),
          assignedMotionId: p.assignedMotionId,
          assignedMotionText: p.assignedMotion?.motionText || null,
          assignedThemeName: p.assignedMotion?.theme?.name || null,
          assignedStance: p.assignedStance,
          spunAt: p.spunAt ? p.spunAt.toISOString() : null,
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
    const message = error instanceof Error ? error.message : "Gagal memuat data peserta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let row: number | undefined;
  try {
    const session = await getAdminSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json();
    const bulk = body !== null && typeof body === "object" && "participants" in body;
    const participants = bulk
      ? validateParticipantBatch((body as { participants: unknown }).participants)
      : [validateParticipant(body)];
    await ensurePrismaWAL();

    // Imports are create-only: any conflict rolls back every row, never overwriting results or identity.
    const created = await prisma.$transaction(async (tx) => {
      const result = [];
      for (let index = 0; index < participants.length; index++) {
        row = bulk ? index + 1 : undefined;
        const item = participants[index];
        const accessToken = await getUniqueToken(tx, item.accessToken);
        result.push(await tx.participant.create({
          data: { ...item, accessToken, hasSpun: false },
          select: { username: true, fullName: true, sessionBatch: true, accessToken: true },
        }));
      }
      return result;
    }, { timeout: 30_000 });

    return NextResponse.json(bulk
      ? { success: true, count: created.length }
      : { success: true, participant: created[0] });
  } catch (error: unknown) {
    return errorResponse(error, "Gagal menambahkan peserta.", row);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { username, fullName, sessionBatch, accessToken } = validateParticipant(await req.json(), true);
    await ensurePrismaWAL();
    const participant = await prisma.participant.update({
      where: { username },
      data: { fullName, sessionBatch, accessToken },
      select: { username: true, fullName: true, sessionBatch: true, accessToken: true },
    });
    return NextResponse.json({ success: true, participant });
  } catch (error: unknown) {
    return errorResponse(error, "Gagal mengubah peserta.");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username?.trim()) {
      return NextResponse.json({ error: "Username wajib disertakan." }, { status: 400 });
    }

    const cleanUsername = username.trim();
    await ensurePrismaWAL();

    await prisma.$transaction(async (tx) => {
      const participant = await tx.participant.findUnique({
        where: { username: cleanUsername },
      });

      if (!participant) {
        throw new ParticipantInputError("Peserta tidak ditemukan.", 404);
      }

      // If participant had spun and had an assigned motion, decrement motion usedCount
      if (participant.assignedMotionId) {
        const motion = await tx.motion.findUnique({
          where: { id: participant.assignedMotionId },
        });

        if (motion && motion.usedCount > 0) {
          await tx.motion.update({
            where: { id: participant.assignedMotionId },
            data: { usedCount: { decrement: 1 } },
          });
        }
      }

      await tx.participant.delete({
        where: { username: cleanUsername },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return errorResponse(error, "Gagal menghapus peserta.");
  }
}
