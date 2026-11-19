import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, getAdminSession, getParticipantSession } from "@/lib/auth";
import { prisma, ensurePrismaWAL } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await ensurePrismaWAL();
    const { searchParams } = new URL(req.url);
    const requestedRole = searchParams.get("role");

    let session = null;
    if (requestedRole === "admin") {
      session = await getAdminSession();
    } else if (requestedRole === "participant") {
      session = await getParticipantSession();
    } else {
      session = await getCurrentSession();
    }
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    if (session.role === "admin") {
      return NextResponse.json({
        authenticated: true,
        role: "admin",
        username: session.username,
      });
    }

    // Participant session: fetch latest state
    const participant = await prisma.participant.findUnique({
      where: { username: session.username },
      include: {
        assignedMotion: {
          include: { theme: true },
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ authenticated: false }, { status: 404 });
    }

    return NextResponse.json({
      authenticated: true,
      role: "participant",
      participant: {
        username: participant.username,
        fullName: participant.fullName,
        sessionBatch: participant.sessionBatch,
        hasSpun: participant.hasSpun,
        assignedMotionId: participant.assignedMotionId,
        assignedMotionText: participant.assignedMotion?.motionText || null,
        assignedThemeName: participant.assignedMotion?.theme?.name || null,
        assignedStance: participant.assignedStance,
        spunAt: participant.spunAt ? participant.spunAt.toISOString() : null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memverifikasi sesi.";
    return NextResponse.json({ authenticated: false, error: message }, { status: 500 });
  }
}
