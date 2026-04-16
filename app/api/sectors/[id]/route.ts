import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, noContent, validationError, err } from "@/lib/api";

const updateSectorSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  order: z.number().int().min(0).optional(),
});

// PATCH /api/sectors/:id — update sector (admin only)
export const PATCH = withAuth(async (request, context, { user }) => {
  if (user.role !== "admin") return err("Apenas administradores podem editar setores", 403);

  const { id } = await context.params;

  let body: unknown;
  try { body = await request.json(); } catch { return err("Invalid JSON", 400); }

  const parsed = updateSectorSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { name, color, order } = parsed.data;
  const updateData: Record<string, unknown> = {};

  if (name !== undefined) {
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const existing = await prisma.sector.findFirst({ where: { slug, NOT: { id } } });
    if (existing) return err("Já existe um setor com este nome", 409);

    updateData.name = name;
    updateData.slug = slug;
  }

  if (color !== undefined) updateData.color = color;
  if (order !== undefined) updateData.order = order;

  const sector = await prisma.sector.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, slug: true, color: true, order: true, isDefault: true },
  });

  return ok(sector);
});

// DELETE /api/sectors/:id — delete sector (admin only, non-default only)
export const DELETE = withAuth(async (_request, context, { user }) => {
  if (user.role !== "admin") return err("Apenas administradores podem remover setores", 403);

  const { id } = await context.params;

  const sector = await prisma.sector.findUnique({
    where: { id },
    select: { id: true, isDefault: true, _count: { select: { particularidades: true } } },
  });

  if (!sector) return err("Setor não encontrado", 404);
  if (sector.isDefault) return err("Setores padrão não podem ser removidos", 400);
  if (sector._count.particularidades > 0) {
    return err("Não é possível remover um setor que possui particularidades cadastradas", 400);
  }

  await prisma.sector.delete({ where: { id } });

  return noContent();
});
