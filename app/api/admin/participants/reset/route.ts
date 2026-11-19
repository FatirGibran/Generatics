import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma, ensurePrismaWAL } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensurePrismaWAL();
    const session = await getAdminSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { username, batch, all } = body;

    if (!username && !batch && !all) {
      return NextResponse.json(
        { error: "Username peserta, batch sesi, atau opsi 'all' wajib disertakan." },
        { status: 400 }
      );
    }

    let resetCount = 0;

    await prisma.$transaction(async (tx) => {
      // 1. Identify which participants to reset
      let targets: { username: string; assignedMotionId: string | null }[] = [];

      if (all === true) {
        targets = await tx.participant.findMany({
          where: { hasSpun: true },
          select: { username: true, assignedMotionId: true },
        });
      } else if (batch) {
        targets = await tx.participant.findMany({
          where: {
            sessionBatch: String(batch).trim(),
            hasSpun: true,
          },
          select: { username: true, assignedMotionId: true },
        });
      } else if (username) {
        const cleanUsername = String(username).trim();
        const single = await tx.participant.findUnique({
          where: { username: cleanUsername },
          select: { username: true, assignedMotionId: true, hasSpun: true },
        });
        if (!single) {
          throw new Error("Peserta tidak ditemukan.");
        }
        targets = [single];
      }

      // 2. Decrement motion usage counts safely
      const motionDecrements = new Map<string, number>();
      for (const p of targets) {
        if (p.assignedMotionId) {
          const current = motionDecrements.get(p.assignedMotionId) || 0;
          motionDecrements.set(p.assignedMotionId, current + 1);
        }
      }

      for (const [motionId, count] of Array.from(motionDecrements.entries())) {
        const motion = await tx.motion.findUnique({ where: { id: motionId } });
        if (motion && motion.usedCount > 0) {
          const newCount = Math.max(0, motion.usedCount - count);
          await tx.motion.update({
            where: { id: motionId },
            data: { usedCount: newCount },
          });
        }
      }

      // 3. Reset participants status
      if (targets.length > 0) {
        const usernames = targets.map((t) => t.username);
        const updateResult = await tx.participant.updateMany({
          where: { username: { in: usernames } },
          data: {
            hasSpun: false,
            assignedMotionId: null,
            assignedStance: null,
            spunAt: null,
          },
        });
        resetCount = updateResult.count;
      }
    });

    return NextResponse.json({
      success: true,
      count: resetCount,
      message: `Berhasil mereset ${resetCount} peserta.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mereset status peserta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
