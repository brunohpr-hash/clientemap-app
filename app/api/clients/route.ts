import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, created, validationError, err, paginated, getPagination } from "@/lib/api";

const createClientSchema = z.object({
  razaoSocial: z.string().min(2).max(300),
  nomeFantasia: z.string().max(300).optional(),
  cnpjCpf: z.string().min(11).max(18),
  inscricaoEstadual: z.string().max(50).optional(),
  inscricaoMunicipal: z.string().max(50).optional(),
  regimeTributario: z.enum(["mei", "simples_nacional", "lucro_presumido", "lucro_real"]),
  dataInicioContabilidade: z.string().optional(), // ISO date string
  status: z.enum(["active", "inactive", "closing"]).default("active"),
  observacoes: z.string().optional(),
  // Map of sectorId → userId for responsibles
  responsibles: z.record(z.string().uuid(), z.string().uuid()).optional(),
});

// GET /api/clients — list with search + filters
export const GET = withAuth(async (request, _context, { user }) => {
  const { skip, take, page } = getPagination(request.url);
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status");
  const regime = url.searchParams.get("regime");
  const sectorId = url.searchParams.get("sectorId");

  // Collaborators only see clients where they are responsible for at least one sector
  const accessFilter =
    user.role === "admin"
      ? {}
      : {
          responsibles: {
            some: { userId: user.sub },
          },
        };

  const where: Record<string, unknown> = { ...accessFilter };
  if (status) where.status = status;
  if (regime) where.regimeTributario = regime;
  if (sectorId) {
    where.responsibles = { some: { sectorId, ...(user.role !== "admin" ? { userId: user.sub } : {}) } };
  }
  if (q) {
    where.OR = [
      { razaoSocial: { contains: q, mode: "insensitive" } },
      { nomeFantasia: { contains: q, mode: "insensitive" } },
      { cnpjCpf: { contains: q } },
    ];
  }

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take,
      orderBy: { razaoSocial: "asc" },
      select: {
        id: true,
        razaoSocial: true,
        nomeFantasia: true,
        cnpjCpf: true,
        regimeTributario: true,
        status: true,
        _count: { select: { particularidades: { where: { isActive: true, vigenciaFim: null } } } },
        responsibles: {
          select: { userId: true, sectorId: true, isPrimary: true, sector: { select: { slug: true } } },
        },
      },
    }),
    prisma.client.count({ where }),
  ]);

  return paginated(clients, total, page, take);
});

// POST /api/clients — create client
export const POST = withAuth(async (request, _context, { user }) => {
  if (user.role !== "admin") return err("Apenas administradores podem criar clientes", 403);

  let body: unknown;
  try { body = await request.json(); } catch { return err("Invalid JSON", 400); }

  const parsed = createClientSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { responsibles: respMap, dataInicioContabilidade, ...clientData } = parsed.data;

  const existing = await prisma.client.findUnique({ where: { cnpjCpf: clientData.cnpjCpf } });
  if (existing) return err("CNPJ/CPF já cadastrado", 409);

  const client = await prisma.client.create({
    data: {
      ...clientData,
      dataInicioContabilidade: dataInicioContabilidade
        ? new Date(dataInicioContabilidade)
        : undefined,
      responsibles: respMap
        ? {
            create: Object.entries(respMap).map(([sectorId, userId]) => ({
              sectorId,
              userId,
              isPrimary: true,
            })),
          }
        : undefined,
    },
    select: {
      id: true, razaoSocial: true, nomeFantasia: true, cnpjCpf: true,
      regimeTributario: true, status: true, createdAt: true,
    },
  });

  return created(client);
});
