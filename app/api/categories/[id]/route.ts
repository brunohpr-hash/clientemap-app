import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, noContent, validationError, err } from "@/lib/api";

const updateCategorySchema = z.object({
  name: z.string().min(2).max(200).optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = withAuth(async (request, context) => {
  const { id } = await context.params;

  let body: unknown;
  try { body = await request.json(); } catch { return err("Invalid JSON", 400); }

  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  // Cannot deactivate if has active particularidades
  if (parsed.data.isActive === false) {
    const count = await prisma.particularidade.count({
      where: { categoryId: id, isActive: true },
    });
    if (count > 0) {
      return err(
        `Não é possível desativar: ${count} particularidade(s) ativa(s) vinculada(s)`,
        409
      );
    }
  }

  const category = await prisma.category.update({ where: { id }, data: parsed.data });
  return ok(category);
});

export const DELETE = withAuth(async (_request, context) => {
  const { id } = await context.params;

  const count = await prisma.particularidade.count({ where: { categoryId: id } });
  if (count > 0) {
    return err("Essa categoria está sendo utilizada em uma particularidade e não poderá ser excluída.", 409);
  }

  await prisma.category.delete({ where: { id } });
  return noContent();
});
