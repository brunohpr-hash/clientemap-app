import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  signAccessToken,
  createRefreshToken,
  setAuthCookies,
} from "@/lib/auth";
import { err, validationError, checkRateLimit } from "@/lib/api";
import { writeAuditLog, getClientIp } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request): Promise<Response> {
  const ip = getClientIp(request);

  // Rate limit: 10 attempts per minute per IP
  if (!checkRateLimit(`login:${ip}`, 10, 60_000)) {
    return err("Muitas tentativas. Aguarde um minuto.", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      sectors: { include: { sector: { select: { id: true, slug: true, name: true } } } },
    },
  });

  if (!user || user.status === "inactive") {
    // Same error message to prevent user enumeration
    return err("E-mail ou senha incorretos.", 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await writeAuditLog({
      userId: user.id,
      action: "login_failed",
      entityType: "user",
      entityId: user.id,
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    return err("E-mail ou senha incorretos.", 401);
  }

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = await createRefreshToken(user.id);
  await setAuthCookies(accessToken, refreshToken);

  await writeAuditLog({
    userId: user.id,
    action: "login",
    entityType: "user",
    entityId: user.id,
    ipAddress: ip,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return Response.json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        sectors: user.sectors.map((us) => us.sector),
      },
      accessToken,
    },
  });
}
