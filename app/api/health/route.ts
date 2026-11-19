import { NextResponse } from "next/server";
import { prisma, ensurePrismaWAL } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensurePrismaWAL();
    await prisma.$queryRawUnsafe("SELECT 1");

    return NextResponse.json(
      {
        status: "ok",
        db: "connected",
        dbProtocol: process.env.DATABASE_URL ? process.env.DATABASE_URL.split(":")[0] : "none",
        app: "debate-generatics-2026",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Health check failed";
    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        app: "debate-generatics-2026",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        error: message,
      },
      { status: 500 }
    );
  }
}
