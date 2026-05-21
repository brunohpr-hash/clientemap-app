import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { withAdmin, withAuth, ok, noContent, validationError, err } from "@/lib/api";

const updateUserSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["admin", "collaborator"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  sectorIds: z.array(z.string().uuid()).optional(),
});

// GET /api/users/:id
export const GET = withAdmin(async (_request, context) => {
  const { id } = await context.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, status: true,
      avatarUrl: true, createdAt: true,
      sectors: { include: { sector: { select: { id: true, name: true, slug: true, color: true } } } },
    },
  });

  if (!user) return err("Usuário não encontrado", 404);
  return ok({ ...user, sectors: user.sectors.map((us) => us.sector) });
});

// PATCH /api/users/:id
export const PATCH = withAdmin(async (request, context) => {
  const { id } = await context.params;

  let body: unknown;
  try { body = await request.json(); } catch { return err("Invalid JSON", 400); }

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { sectorIds, password, email, ...rest } = parsed.data;

  // Find the current user to resolve their role and ensure they exist
  const currentUser = await prisma.user.findUnique({
    where: { id },
  });
  if (!currentUser) return err("Usuário não encontrado", 404);

  const updateData: Record<string, unknown> = { ...rest };

  if (email) {
    const existing = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), NOT: { id } },
    });
    if (existing) return err("E-mail já em uso", 409);
    updateData.email = email.toLowerCase();
  }

  if (password) {
    updateData.passwordHash = await hashPassword(password);
  }

  // Resolve final role to manage sectors appropriately
  const finalRole = parsed.data.role ?? currentUser.role;

  if (finalRole === "admin") {
    // Admins do not have specific sectors assigned (they see everything)
    await prisma.userSector.deleteMany({ where: { userId: id } });
  } else if (sectorIds !== undefined) {
    // For collaborators, cleanly recreate sector assignments if provided
    await prisma.userSector.deleteMany({ where: { userId: id } });
    if (sectorIds.length > 0) {
      await prisma.userSector.createMany({
        data: sectorIds.map((sectorId) => ({ userId: id, sectorId })),
      });
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true, name: true, email: true, role: true, status: true,
      sectors: { include: { sector: { select: { id: true, name: true, slug: true } } } },
    },
  });

  return ok({ ...user, sectors: user.sectors.map((us) => us.sector) });
});

// DELETE /api/users/:id — soft delete (set inactive)
export const DELETE = withAdmin(async (_request, context) => {
  const { id } = await context.params;

  await prisma.user.update({
    where: { id },
    data: { status: "inactive" },
  });

  return noContent();
});
