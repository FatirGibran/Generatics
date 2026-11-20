import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma, ensurePrismaWAL } from "@/lib/prisma";
import { signSessionToken, ADMIN_COOKIE_NAME, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json().catch(() => null);
    const { username, password } = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

    if (typeof username !== "string" || !username.trim() || typeof password !== "string" || !password) {
      return NextResponse.json(
        { error: "Username dan password panitia wajib diisi." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim();
    await ensurePrismaWAL();

    const admin = await prisma.admin.findUnique({
      where: { username: cleanUsername },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "Kredensial panitia salah atau belum terdaftar." },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Kata sandi panitia tidak sesuai." },
        { status: 401 }
      );
    }

    const token = await signSessionToken({
      role: "admin",
      username: cleanUsername,
    });

    // Detect HTTPS (reverse proxy, Cloudflare tunnel, or native TLS)
    const isHttps =
      req.headers.get("x-forwarded-proto") === "https" ||
      req.nextUrl.protocol === "https:";

    const response = NextResponse.json({
      success: true,
      admin: {
        username: cleanUsername,
      },
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
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
  } catch (error: unknown) {
    console.error("Autentikasi panitia gagal:", error);
    return NextResponse.json({ error: "Layanan masuk panitia belum tersedia. Silakan coba lagi." }, { status: 500 });
  }
}
