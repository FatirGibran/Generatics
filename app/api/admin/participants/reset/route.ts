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

    const body: unknown = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Kirim objek JSON berisi username, batch, atau all: true." }, { status: 400 });
    }
    const { username, batch, all } = body as Record<string, unknown>;
    if (Object.keys(body).some((key) => !["username", "batch", "all"].includes(key)) ||
        (username !== undefined && (typeof username !== "string" || !username.trim())) ||
        (batch !== undefined && (typeof batch !== "string" || !batch.trim())) ||
        (all !== undefined && typeof all !== "boolean")) {
      return NextResponse.json({ error: "username dan batch harus berupa string tidak kosong; all harus boolean (true/false)." }, { status: 400 });
    }
    if (Number(username !== undefined) + Number(batch !== undefined) + Number(all === true) !== 1) {
      return NextResponse.json({ error: "Pilih tepat satu target reset: username, batch, atau all: true." }, { status: 400 });
    }

    let resetCount = 0;

    const found = await prisma.$transaction(async (tx) => {
      // Acquire SQLite's writer lock before reads, matching the spin transaction.
      await tx.$executeRaw`UPDATE "Participant" SET "hasSpun" = "hasSpun" WHERE 1 = 0`;
      const participants = await tx.participant.findMany({
        where: typeof username === "string" ? { username: username.trim() } :
          typeof batch === "string" ? { sessionBatch: batch.trim() } : {},
        select: { username: true, assignedMotionId: true, hasSpun: true },
      });
      if (participants.length === 0 && all !== true) return false;
      const targets = participants.filter((participant) => participant.hasSpun);

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
      return true;
    });

    if (!found) {
      return NextResponse.json({ error: typeof username === "string"
        ? `Peserta '${username.trim()}' tidak ditemukan. Periksa username peserta.`
        : `Tidak ada peserta pada batch '${typeof batch === "string" ? batch.trim() : ""}'. Periksa nama batch sesi.` }, { status: 404 });
    }

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
