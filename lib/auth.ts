import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "15m";
const REFRESH_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d";

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: "admin" | "collaborator";
  iat?: number;
  exp?: number;
}

// ── Password helpers ─────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── Access token ─────────────────────────────────────────────

export function signAccessToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

// ── Refresh token ─────────────────────────────────────────────

export async function createRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(64).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");

  // Expire in REFRESH_EXPIRES_IN (default 7 days)
  const days = parseInt(REFRESH_EXPIRES_IN) || 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return raw;
}

export async function rotateRefreshToken(
  raw: string
): Promise<{ userId: string; newRaw: string } | null> {
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await prisma.refreshToken.delete({ where: { tokenHash } });
    return null;
  }

  await prisma.refreshToken.delete({ where: { tokenHash } });
  const newRaw = await createRefreshToken(stored.userId);
  return { userId: stored.userId, newRaw };
}

// ── Cookie helpers ────────────────────────────────────────────

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string
) {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";

  cookieStore.set("access_token", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60, // 15 minutes
  });

  cookieStore.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/auth/refresh",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
}

// ── Request auth helper (for Route Handlers) ─────────────────

export function getTokenFromRequest(request: Request): string | null {
  // 1. Authorization header
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  // 2. Cookie (httpOnly — available server-side via headers)
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function verifyRequestToken(request: Request): JwtPayload {
  const token = getTokenFromRequest(request);
  if (!token) throw new Error("No token");
  return verifyAccessToken(token);
}
