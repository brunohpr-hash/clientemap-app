import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdmin, withAuth, ok, created, validationError, err } from "@/lib/api";

const createCategorySchema = z.object({
  sectorId: z.string().uuid(),
  name: z.string().min(2).max(200),
  order: z.number().int().default(0),
});

export const GET = withAuth(async (request) => {
  const url = new URL(request.url);
  const sectorId = url.searchParams.get("sectorId");

  const categories = await prisma.category.findMany({
    where: { ...(sectorId ? { sectorId } : {}), isActive: true },
    orderBy: [{ sectorId: "asc" }, { order: "asc" }],
    select: {
      id: true, name: true, order: true, sectorId: true, isActive: true,
      sector: { select: { id: true, name: true, slug: true } },
    },
  });
  return ok(categories);
});

export const POST = withAdmin(async (request) => {
  let body: unknown;
  try { body = await request.json(); } catch { return err("Invalid JSON", 400); }

  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const category = await prisma.category.create({ data: parsed.data });
  return created(category);
});
