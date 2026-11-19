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

    const total = participants.length;
    const spunList = participants.filter((p) => Boolean(p.hasSpun));
    const spun = spunList.length;
    const unspun = total - spun;

    const pro = participants.filter((p) => p.assignedStance === "PRO").length;
    const kontra = participants.filter((p) => p.assignedStance === "KONTRA").length;

    const split = (batchName: string) => {
      const list = participants.filter((p) => p.sessionBatch === batchName);
      return {
        batch: batchName,
        pro: list.filter((p) => p.assignedStance === "PRO").length,
        kontra: list.filter((p) => p.assignedStance === "KONTRA").length,
        count: list.length,
        spun: list.filter((p) => Boolean(p.hasSpun)).length,
      };
    };

    const recentSpins = [...spunList]
      .sort((a, b) => {
        const timeA = a.spunAt ? new Date(a.spunAt).getTime() : 0;
        const timeB = b.spunAt ? new Date(b.spunAt).getTime() : 0;
        return timeB - timeA;
      })
      .map((p) => ({
        username: p.username,
        fullName: p.fullName,
        sessionBatch: p.sessionBatch,
        hasSpun: Boolean(p.hasSpun),
        assignedMotionId: p.assignedMotionId,
        assignedMotionText: p.assignedMotion?.motionText || null,
        assignedThemeName: p.assignedMotion?.theme?.name || null,
        assignedStance: p.assignedStance,
        spunAt: p.spunAt ? p.spunAt.toISOString() : null,
      }));

    return NextResponse.json(
      {
        stats: {
          total,
          spun,
          unspun,
          pro,
          kontra,
          sessions: [split("Day 1"), split("Day 2")],
        },
        recentSpins,
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
    const message = error instanceof Error ? error.message : "Gagal memuat overview admin.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
