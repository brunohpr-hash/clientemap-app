import { prisma } from "@/lib/prisma";
import { withAuth, err } from "@/lib/api";

// GET /api/reports/csv?clientId=xxx&sectorId=xxx — export filtered particularidades as CSV
export const GET = withAuth(async (request, _context, { user }) => {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");
  const sectorId = url.searchParams.get("sectorId");
  const criticality = url.searchParams.get("criticality");
  const status = url.searchParams.get("status"); // active | closed | all

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

  const items = await prisma.particularidade.findMany({
    where,
    orderBy: [{ criticality: "desc" }, { updatedAt: "desc" }],
    take: 5000, // safety cap
    include: {
      client: { select: { razaoSocial: true, nomeFantasia: true, cnpjCpf: true } },
      sector: { select: { name: true } },
      category: { select: { name: true } },
      createdByUser: { select: { name: true } },
      updatedByUser: { select: { name: true } },
    },
  });

  const fmt = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : "";

  const escape = (s: string) =>
    `"${String(s ?? "").replace(/"/g, '""').replace(/<[^>]*>/g, " ").trim()}"`;

  const headers = [
    "Cliente",
    "CNPJ/CPF",
    "Setor",
    "Categoria",
    "Título",
    "Criticidade",
    "Vigência Início",
    "Vigência Fim",
    "Status",
    "Criado Por",
    "Editado Por",
    "Última Edição",
  ];

  const rows = items.map((p) => [
    escape(p.client.nomeFantasia ?? p.client.razaoSocial),
    escape(p.client.cnpjCpf),
    escape(p.sector.name),
    escape(p.category?.name ?? ""),
    escape(p.title),
    escape(p.criticality === "critica" ? "Crítica" : p.criticality === "atencao" ? "Atenção" : "Informativa"),
    fmt(p.vigenciaInicio),
    fmt(p.vigenciaFim),
    p.isActive && !p.vigenciaFim ? "Vigente" : "Encerrada",
    escape(p.createdByUser.name),
    escape(p.updatedByUser.name),
    fmt(p.updatedAt),
  ]);

  const csv =
    "\uFEFF" + // BOM for Excel UTF-8
    [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="particularidades-${Date.now()}.csv"`,
    },
  });
});
