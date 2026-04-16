import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, created, validationError, err } from "@/lib/api";

const createSectorSchema = z.object({
  name: z.string().min(2).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#3B82F6"),
  order: z.number().int().min(0).optional(),
});

// GET /api/sectors — all sectors (used for forms, tabs, etc.)
export const GET = withAuth(async () => {
  const sectors = await prisma.sector.findMany({
    orderBy: { order: "asc" },
    include: {
      categories: {
        where: { isActive: true },
        orderBy: { order: "asc" },
        select: { id: true, name: true, order: true },
      },
      _count: { select: { particularidades: true } },
    },
  });
  return ok(sectors);
});

// POST /api/sectors — create new sector (admin only)
export const POST = withAuth(async (request, _context, { user }) => {
  if (user.role !== "admin") return err("Apenas administradores podem criar setores", 403);

  let body: unknown;
  try { body = await request.json(); } catch { return err("Invalid JSON", 400); }

  const parsed = createSectorSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { name, color, order } = parsed.data;

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const existing = await prisma.sector.findUnique({ where: { slug } });
  if (existing) return err("Já existe um setor com este nome", 409);

  // If order not provided, place at the end
  const maxOrder = order ?? (await prisma.sector.count());

  const sector = await prisma.sector.create({
    data: { name, slug, color, order: maxOrder },
    select: { id: true, name: true, slug: true, color: true, order: true, isDefault: true, createdAt: true },
  });

  return created(sector);
});
