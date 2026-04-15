import { prisma } from "@/lib/prisma";
import { withAuth, ok, err } from "@/lib/api";

// GET /api/search?q=termo&limit=20
// Full-text search across clients + particularidades using PostgreSQL ilike
// (tsvector GIN index is used by Supabase's pg_search; for cross-table, we query both)
export const GET = withAuth(async (request, _context, { user }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const limit = Math.min(50, parseInt(url.searchParams.get("limit") ?? "20"));

  if (!q || q.length < 2) return err("Query must be at least 2 characters", 400);

  const accessFilter =
    user.role === "admin"
      ? {}
      : { client: { responsibles: { some: { userId: user.sub } } } };

  const clientAccessFilter =
    user.role === "admin"
      ? {}
      : { responsibles: { some: { userId: user.sub } } };

  const [clients, particularidades] = await Promise.all([
    prisma.client.findMany({
      where: {
        ...clientAccessFilter,
        OR: [
          { razaoSocial: { contains: q, mode: "insensitive" } },
          { nomeFantasia: { contains: q, mode: "insensitive" } },
          { cnpjCpf: { contains: q } },
        ],
      },
      take: limit,
      select: {
        id: true,
        razaoSocial: true,
        nomeFantasia: true,
        cnpjCpf: true,
        status: true,
        regimeTributario: true,
      },
    }),
    prisma.particularidade.findMany({
      where: {
        ...accessFilter,
        isActive: true,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: limit,
      orderBy: [{ criticality: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        criticality: true,
        vigenciaInicio: true,
        vigenciaFim: true,
        client: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
        sector: { select: { id: true, name: true, slug: true, color: true } },
        category: { select: { id: true, name: true } },
      },
    }),
  ]);

  return ok({
    query: q,
    clients,
    particularidades,
    total: clients.length + particularidades.length,
  });
});
