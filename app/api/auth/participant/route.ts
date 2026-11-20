import { NextRequest, NextResponse } from "next/server";
import { prisma, ensurePrismaWAL } from "@/lib/prisma";
import { signSessionToken, PARTICIPANT_COOKIE_NAME, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const username = body?.username;
    const accessToken = body?.accessToken;

    if (typeof username !== "string" || typeof accessToken !== "string" ||
        !username.trim() || !accessToken.trim()) {
      return NextResponse.json(
        { error: "Username dan Token Akses wajib diisi." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim();
    const cleanToken = accessToken.trim().toUpperCase();

    await ensurePrismaWAL();
    const participant = await prisma.participant.findUnique({
      where: { username: cleanUsername },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Akun peserta tidak ditemukan. Pastikan Username/NIM sudah terdaftar." },
        { status: 404 }
      );
    }

    if (participant.accessToken.trim().toUpperCase() !== cleanToken) {
      return NextResponse.json(
        { error: "Token Akses tidak valid. Silakan periksa kembali token dari LO." },
        { status: 401 }
      );
    }

    const token = await signSessionToken({
      role: "participant",
      username: cleanUsername,
      fullName: participant.fullName,
      sessionBatch: participant.sessionBatch,
    });

    const isHttps =
      req.headers.get("x-forwarded-proto") === "https" ||
      req.nextUrl.protocol === "https:";

    const response = NextResponse.json({
      success: true,
      participant: {
        username: cleanUsername,
        fullName: participant.fullName,
        sessionBatch: participant.sessionBatch,
        hasSpun: participant.hasSpun,
      },
    });

    response.cookies.set({
      name: PARTICIPANT_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    // Legacy compatibility cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan internal server. Silakan coba lagi." }, { status: 500 });
  }
}
