import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma, ensurePrismaWAL } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensurePrismaWAL();
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await req.json();
    if (!username) {
      return NextResponse.json({ error: "Username peserta wajib disertakan." }, { status: 400 });
    }

    const cleanUsername = String(username).trim();

    await prisma.$transaction(async (tx) => {
      const participant = await tx.participant.findUnique({
        where: { username: cleanUsername },
      });

      if (!participant) {
        throw new Error("Peserta tidak ditemukan.");
      }

      if (participant.assignedMotionId) {
        const motion = await tx.motion.findUnique({
          where: { id: participant.assignedMotionId },
        });

        if (motion && motion.usedCount > 0) {
          await tx.motion.update({
            where: { id: participant.assignedMotionId },
            data: {
              usedCount: { decrement: 1 },
            },
          });
        }
      }

      await tx.participant.update({
        where: { username: cleanUsername },
        data: {
          hasSpun: false,
          assignedMotionId: null,
          assignedStance: null,
          spunAt: null,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mereset status peserta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
