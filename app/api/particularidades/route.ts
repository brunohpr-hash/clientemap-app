import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, created, validationError, err, paginated, getPagination } from "@/lib/api";
import { notifyParticularidadeChange } from "@/lib/notifications";

const createSchema = z.object({
  clientId: z.string().uuid(),
  sectorId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  title: z.string().min(3).max(150),
  description: z.string().min(1),
  criticality: z.enum(["informativa", "atencao", "critica"]).default("informativa"),
  vigenciaInicio: z.string(), // ISO date
  vigenciaFim: z.string().optional(),
});

// GET /api/particularidades — list with filters
export const GET = withAuth(async (request, _context, { user }) => {
  const { skip, take, page } = getPagination(request.url);
  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");
  const sectorId = url.searchParams.get("sectorId");
  const criticality = url.searchParams.get("criticality");
  const status = url.searchParams.get("status"); // "active" | "closed"
  const q = url.searchParams.get("q");

  // Collaborators only see clients they're responsible for
  const accessFilter =
    user.role === "admin"
      ? {}
      : { client: { responsibles: { some: { userId: user.sub } } } };

  const where: Record<string, unknown> = { ...accessFilter };
  if (clientId) where.clientId = clientId;
  if (sectorId) where.sectorId = sectorId;
  if (criticality) where.criticality = criticality;
  if (status === "active") { where.isActive = true; where.vigenciaFim = null; }
  if (status === "closed") { where.OR = [{ isActive: false }, { vigenciaFim: { not: null } }]; }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.particularidade.findMany({
      where,
      skip,
      take,
      orderBy: [{ criticality: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true, title: true, description: true, criticality: true, vigenciaInicio: true,
        vigenciaFim: true, isActive: true, createdAt: true, updatedAt: true,
        category: { select: { id: true, name: true } },
        sector: { select: { id: true, name: true, slug: true, color: true } },
        client: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
        createdByUser: { select: { id: true, name: true } },
        updatedByUser: { select: { id: true, name: true } },
        _count: { select: { attachments: true } },
      },
    }),
    prisma.particularidade.count({ where }),
  ]);

  return paginated(items, total, page, take);
});

// POST /api/particularidades
export const POST = withAuth(async (request, _context, { user }) => {
  let body: unknown;
  try { body = await request.json(); } catch { return err("Invalid JSON", 400); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { vigenciaInicio, vigenciaFim, ...data } = parsed.data;

  // Check access: collaborator must be responsible for the sector on this client
  if (user.role !== "admin") {
    const responsible = await prisma.clientResponsible.findFirst({
      where: { clientId: data.clientId, userId: user.sub, sectorId: data.sectorId },
    });
    if (!responsible) return err("Sem permissão para este cliente/setor", 403);
  }

  const item = await prisma.particularidade.create({
    data: {
      ...data,
      vigenciaInicio: new Date(vigenciaInicio),
      vigenciaFim: vigenciaFim ? new Date(vigenciaFim) : undefined,
      createdBy: user.sub,
      updatedBy: user.sub,
      history: {
        create: {
          action: "created",
          newValues: JSON.parse(JSON.stringify({ ...data, vigenciaInicio, vigenciaFim })),
          performedBy: user.sub,
        },
      },
    },
    select: { id: true, title: true, criticality: true, vigenciaInicio: true, createdAt: true },
  });

  // Notify if critical
  if (data.criticality === "critica") {
    await notifyParticularidadeChange(
      item.id, data.clientId, data.sectorId, user.sub, "critica"
    );
  }

  return created(item);
});
