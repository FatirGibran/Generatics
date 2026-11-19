import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, ADMIN_COOKIE_NAME, PARTICIPANT_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const isHttps =
    req.headers.get("x-forwarded-proto") === "https" ||
    req.nextUrl.protocol === "https:";

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");

  const response = NextResponse.json({ success: true });

  const cookieOptions = {
    value: "",
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };

  if (role === "admin") {
    response.cookies.set({ name: ADMIN_COOKIE_NAME, ...cookieOptions });
    response.cookies.set({ name: COOKIE_NAME, ...cookieOptions });
  } else if (role === "participant") {
    response.cookies.set({ name: PARTICIPANT_COOKIE_NAME, ...cookieOptions });
    response.cookies.set({ name: COOKIE_NAME, ...cookieOptions });
  } else {
    response.cookies.set({ name: ADMIN_COOKIE_NAME, ...cookieOptions });
    response.cookies.set({ name: PARTICIPANT_COOKIE_NAME, ...cookieOptions });
    response.cookies.set({ name: COOKIE_NAME, ...cookieOptions });
  }

  return response;
}
