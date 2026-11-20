import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, getAdminSession, getParticipantSession } from "@/lib/auth";
import { prisma, ensurePrismaWAL } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
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
    await ensurePrismaWAL();
    const participant = await prisma.participant.findUnique({
      where: { username: session.username },
      include: {
        assignedMotion: {
          include: { theme: true },
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
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
        // Standardized aliases
        motionText: participant.assignedMotion?.motionText || null,
        themeName: participant.assignedMotion?.theme?.name || null,
        stance: participant.assignedStance,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false, error: "Gagal memverifikasi sesi." }, { status: 500 });
  }
}
