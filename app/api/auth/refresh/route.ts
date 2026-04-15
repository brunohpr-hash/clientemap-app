import {
  rotateRefreshToken,
  signAccessToken,
  setAuthCookies,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { err } from "@/lib/api";

export async function POST(request: Request): Promise<Response> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)refresh_token=([^;]+)/);
  const rawToken = match ? decodeURIComponent(match[1]) : null;

  if (!rawToken) return err("No refresh token", 401);

  const result = await rotateRefreshToken(rawToken);
  if (!result) return err("Refresh token invalid or expired", 401);

  const user = await prisma.user.findUnique({
    where: { id: result.userId },
    select: { id: true, email: true, role: true, status: true },
  });

  if (!user || user.status === "inactive") {
    return err("User not found or inactive", 401);
  }

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  await setAuthCookies(accessToken, result.newRaw);

  return Response.json({ success: true, data: { accessToken } });
}
