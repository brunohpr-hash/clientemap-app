import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { withAdmin, withAuth, ok, created, validationError, err, paginated, getPagination } from "@/lib/api";

const createUserSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email(),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
  role: z.enum(["admin", "collaborator"]).default("collaborator"),
  sectorIds: z.array(z.string().uuid()).default([]),
});

// GET /api/users — admin only, list all users
export const GET = withAdmin(async (request) => {
  const { skip, take, page } = getPagination(request.url);
  const url = new URL(request.url);
  const search = url.searchParams.get("q") ?? "";

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        createdAt: true,
        sectors: {
          include: { sector: { select: { id: true, name: true, slug: true, color: true } } },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const data = users.map((u) => ({
    ...u,
    sectors: u.sectors.map((us) => us.sector),
  }));

  return paginated(data, total, page, take);
});

// POST /api/users — admin only, create user
export const POST = withAdmin(async (request) => {
  let body: unknown;
  try { body = await request.json(); } catch { return err("Invalid JSON", 400); }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { name, email, password, role, sectorIds } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return err("E-mail já cadastrado", 409);

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      sectors: {
        create: sectorIds.map((sectorId) => ({ sectorId })),
      },
    },
    select: {
      id: true, name: true, email: true, role: true, status: true, createdAt: true,
      sectors: { include: { sector: { select: { id: true, name: true, slug: true } } } },
    },
  });

  return created({ ...user, sectors: user.sectors.map((us) => us.sector) });
});
