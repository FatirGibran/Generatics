import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { AuthSession } from "./types";

function getSigningKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

function isAuthSession(payload: unknown): payload is AuthSession {
  return !!payload && typeof payload === "object" && "role" in payload && "username" in payload &&
    (payload.role === "admin" || payload.role === "participant") &&
    typeof payload.username === "string" && payload.username.trim().length > 0;
}

// Dedicated role-separated cookies to prevent session collisions when testing both roles in one browser
export const COOKIE_NAME = "generatics_session";
export const ADMIN_COOKIE_NAME = "generatics_admin_session";
export const PARTICIPANT_COOKIE_NAME = "generatics_participant_session";

export async function signSessionToken(payload: AuthSession): Promise<string> {
  const key = getSigningKey();
  if (!isAuthSession(payload)) throw new Error("Session requires a valid role and non-empty username.");
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifySessionToken(token: string): Promise<AuthSession | null> {
  const key = getSigningKey();
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return isAuthSession(payload) ? payload : null;
  } catch {
    return null;
  }
}

/**
 * Resolves active Admin session from dedicated admin cookie or legacy cookie
 */
export async function getAdminSession(): Promise<AuthSession | null> {
  const cookieStore = cookies();
  const adminToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (adminToken) {
    const session = await verifySessionToken(adminToken);
    if (session && session.role === "admin") return session;
  }
  const legacyToken = cookieStore.get(COOKIE_NAME)?.value;
  if (legacyToken) {
    const session = await verifySessionToken(legacyToken);
    if (session && session.role === "admin") return session;
  }
  return null;
}

/**
 * Resolves active Participant session from dedicated participant cookie or legacy cookie
 */
export async function getParticipantSession(): Promise<AuthSession | null> {
  const cookieStore = cookies();
  const partToken = cookieStore.get(PARTICIPANT_COOKIE_NAME)?.value;
  if (partToken) {
    const session = await verifySessionToken(partToken);
    if (session && session.role === "participant") return session;
  }
  const legacyToken = cookieStore.get(COOKIE_NAME)?.value;
  if (legacyToken) {
    const session = await verifySessionToken(legacyToken);
    if (session && session.role === "participant") return session;
  }
  return null;
}

/**
 * Generic session resolver: checks Admin first, then Participant
 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  const admin = await getAdminSession();
  if (admin) return admin;
  return await getParticipantSession();
}
