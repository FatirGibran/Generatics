import { NextResponse } from "next/server";
import crypto from "crypto";
import { getParticipantSession } from "@/lib/auth";
import { prisma, ensurePrismaWAL } from "@/lib/prisma";
import { Stance } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensurePrismaWAL();
    const session = await getParticipantSession();
    if (!session || session.role !== "participant") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [setting, themes, participant] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { id: 1 } }),
      prisma.theme.findMany({
        where: { isActive: true },
        select: { id: true, name: true, description: true },
      }),
      prisma.participant.findUnique({
        where: { username: session.username },
        include: {
          assignedMotion: {
            include: { theme: true },
          },
        },
      }),
    ]);

    const settings = setting || {
      isSpinOpen: false,
      prepDurationSeconds: 300,
      randomMode: "BALANCED",
    };

    return NextResponse.json({
      settings: {
        isSpinOpen: !!settings.isSpinOpen,
        prepDurationSeconds: settings.prepDurationSeconds || 300,
        randomMode: settings.randomMode || "BALANCED",
      },
      themes,
      participant: participant
        ? {
            username: participant.username,
            fullName: participant.fullName,
            sessionBatch: participant.sessionBatch,
            hasSpun: participant.hasSpun,
            assignedMotionId: participant.assignedMotionId,
            assignedMotionText: participant.assignedMotion?.motionText || null,
            assignedThemeName: participant.assignedMotion?.theme?.name || null,
            assignedStance: participant.assignedStance,
            spunAt: participant.spunAt ? participant.spunAt.toISOString() : null,
          }
        : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengambil status arena spin.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    await ensurePrismaWAL();
    const session = await getParticipantSession();
    if (!session || session.role !== "participant") {
      return NextResponse.json({ error: "Sesi tidak valid. Silakan login kembali." }, { status: 401 });
    }

    const username = session.username;

    // Fast-path check outside transaction
    const initialParticipant = await prisma.participant.findUnique({
      where: { username },
      include: {
        assignedMotion: {
          include: { theme: true },
        },
      },
    });

    if (!initialParticipant) {
      return NextResponse.json({ error: "Akun peserta tidak terdaftar." }, { status: 404 });
    }

    if (initialParticipant.hasSpun) {
      return NextResponse.json({
        success: true,
        alreadySpun: true,
        themeName: initialParticipant.assignedMotion?.theme?.name || "Tema Terpilih",
        motionText: initialParticipant.assignedMotion?.motionText || "Mosi Terpilih",
        stance: initialParticipant.assignedStance,
        spunAt: initialParticipant.spunAt ? initialParticipant.spunAt.toISOString() : new Date().toISOString(),
      });
    }

    // Execute atomic transaction for spin
    const result = await prisma.$transaction(async (tx) => {
      // 1. Read global settings
      const settings = await tx.systemSetting.findUnique({ where: { id: 1 } });
      if (!settings?.isSpinOpen) {
        throw new Error("Sesi undian mosi belum dibuka oleh panitia.");
      }

      // 2. Read participant inside transaction
      const p = await tx.participant.findUnique({
        where: { username },
        include: {
          assignedMotion: {
            include: { theme: true },
          },
        },
      });

      if (!p) {
        throw new Error("Data peserta tidak ditemukan.");
      }

      if (p.hasSpun) {
        return {
          alreadySpun: true,
          themeName: p.assignedMotion?.theme?.name || "Tema Terpilih",
          motionText: p.assignedMotion?.motionText || "Mosi Terpilih",
          stance: p.assignedStance,
          spunAt: p.spunAt ? p.spunAt.toISOString() : new Date().toISOString(),
        };
      }

      // 3. Query active motions with their themes
      const activeMotions = await tx.motion.findMany({
        where: { isActive: true },
        include: { theme: true },
      });

      const availableMotions = activeMotions.filter((m) => {
        const max = m.maxUsage;
        const used = m.usedCount;
        return max === null || max === undefined || used < max;
      });

      if (availableMotions.length === 0) {
        throw new Error("Seluruh mosi aktif telah mencapai kuota maksimal. Hubungi panitia.");
      }

      // Select random motion via cryptographic randomness
      const randomIndex = crypto.randomInt(0, availableMotions.length);
      const chosenMotion = availableMotions[randomIndex];

      // 4. Determine Stance (PRO / KONTRA)
      let stance: Stance;
      const randomMode = settings.randomMode || "BALANCED";

      if (randomMode === "BALANCED") {
        const batch = p.sessionBatch || "Day 1";
        const batchParticipants = await tx.participant.findMany({
          where: { sessionBatch: batch, hasSpun: true },
          select: { assignedStance: true },
        });

        let proCount = 0;
        let kontraCount = 0;

        for (const bp of batchParticipants) {
          if (bp.assignedStance === "PRO") proCount++;
          else if (bp.assignedStance === "KONTRA") kontraCount++;
        }

        if (proCount - kontraCount >= 2) {
          stance = "KONTRA";
        } else if (kontraCount - proCount >= 2) {
          stance = "PRO";
        } else {
          stance = crypto.randomInt(0, 2) === 0 ? "PRO" : "KONTRA";
        }
      } else {
        stance = crypto.randomInt(0, 2) === 0 ? "PRO" : "KONTRA";
      }

      // 5. Atomic writes
      const now = new Date();

      await tx.participant.update({
        where: { username: p.username },
        data: {
          hasSpun: true,
          assignedMotionId: chosenMotion.id,
          assignedStance: stance,
          spunAt: now,
        },
      });

      await tx.motion.update({
        where: { id: chosenMotion.id },
        data: {
          usedCount: { increment: 1 },
        },
      });

      return {
        alreadySpun: false,
        themeName: chosenMotion.theme.name,
        motionText: chosenMotion.motionText,
        stance,
        spunAt: now.toISOString(),
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Terjadi kegagalan saat pengundian.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
