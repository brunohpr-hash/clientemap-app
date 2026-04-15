import { prisma } from "@/lib/prisma";
import { withAuth, err } from "@/lib/api";

// GET /api/reports/pdf?clientId=xxx — generate PDF for a client's particularidades
export const GET = withAuth(async (request, _context, { user }) => {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");
  const sectorId = url.searchParams.get("sectorId");

  if (!clientId) return err("clientId is required", 400);

  const accessFilter =
    user.role === "admin"
      ? {}
      : { responsibles: { some: { userId: user.sub } } };

  const client = await prisma.client.findFirst({
    where: { id: clientId, ...accessFilter },
    include: {
      responsibles: {
        include: {
          user: { select: { name: true } },
          sector: { select: { name: true } },
        },
      },
    },
  });

  if (!client) return err("Cliente não encontrado", 404);

  const particularidades = await prisma.particularidade.findMany({
    where: {
      clientId,
      ...(sectorId ? { sectorId } : {}),
      isActive: true,
      vigenciaFim: null,
    },
    orderBy: [{ criticality: "desc" }, { sectorId: "asc" }],
    include: {
      sector: { select: { name: true, color: true } },
      category: { select: { name: true } },
      createdByUser: { select: { name: true } },
    },
  });

  const sectors = await prisma.sector.findMany({ orderBy: { order: "asc" } });

  // Build HTML for Puppeteer
  const CRITICALITY_COLOR: Record<string, string> = {
    informativa: "#10B981",
    atencao: "#F59E0B",
    critica: "#EF4444",
  };

  const CRITICALITY_LABEL: Record<string, string> = {
    informativa: "Informativa",
    atencao: "Atenção",
    critica: "Crítica",
  };

  const formatDate = (d: Date | string) =>
    new Date(d).toLocaleDateString("pt-BR");

  const grouped = sectors.map((s) => ({
    sector: s,
    items: particularidades.filter((p) => p.sectorId === s.id),
  })).filter((g) => g.items.length > 0);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; font-size: 13px; padding: 32px; }
  h1 { font-size: 22px; color: #1E3A5F; margin-bottom: 4px; }
  .subtitle { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
  .meta { display: flex; gap: 24px; margin-bottom: 28px; border-left: 4px solid #3B82F6; padding-left: 12px; }
  .meta-item { }
  .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
  .meta-value { font-weight: 600; font-size: 13px; }
  .sector-title { font-size: 15px; font-weight: 700; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 2px solid; }
  .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin-bottom: 10px; page-break-inside: avoid; }
  .card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .badge { display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; padding: 2px 8px; font-size: 11px; font-weight: 600; }
  .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
  .card-title { font-size: 14px; font-weight: 600; flex: 1; }
  .card-category { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
  .card-desc { font-size: 12px; color: #374151; line-height: 1.5; margin-top: 6px; }
  .card-footer { margin-top: 8px; font-size: 10px; color: #9ca3af; }
  .no-items { color: #9ca3af; font-style: italic; text-align: center; padding: 12px; }
  .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<h1>${client.nomeFantasia ?? client.razaoSocial}</h1>
<p class="subtitle">Ficha de Particularidades — gerado em ${formatDate(new Date())}</p>

<div class="meta">
  <div class="meta-item">
    <div class="meta-label">CNPJ/CPF</div>
    <div class="meta-value">${client.cnpjCpf}</div>
  </div>
  <div class="meta-item">
    <div class="meta-label">Regime</div>
    <div class="meta-value">${client.regimeTributario.replace("_", " ").toUpperCase()}</div>
  </div>
  <div class="meta-item">
    <div class="meta-label">Status</div>
    <div class="meta-value">${client.status === "active" ? "Ativo" : client.status === "closing" ? "Em Encerramento" : "Inativo"}</div>
  </div>
  <div class="meta-item">
    <div class="meta-label">Total Particularidades</div>
    <div class="meta-value">${particularidades.length}</div>
  </div>
</div>

${grouped.map(({ sector, items }) => `
<div class="sector-title" style="color:${sector.color ?? "#3B82F6"}; border-color:${sector.color ?? "#3B82F6"}">
  ${sector.name} (${items.length})
</div>
${items.map((p) => `
<div class="card">
  <div class="card-header">
    <span class="card-title">${p.title}</span>
    <span class="badge" style="background:${CRITICALITY_COLOR[p.criticality]}20; color:${CRITICALITY_COLOR[p.criticality]}">
      <span class="dot" style="background:${CRITICALITY_COLOR[p.criticality]}"></span>
      ${CRITICALITY_LABEL[p.criticality]}
    </span>
    ${p.category ? `<span class="card-category">${p.category.name}</span>` : ""}
  </div>
  <div class="card-desc">${p.description.replace(/<[^>]*>/g, " ").substring(0, 500)}</div>
  <div class="card-footer">
    Vigência: ${formatDate(p.vigenciaInicio)} · Criado por ${p.createdByUser.name}
  </div>
</div>`).join("")}
`).join("")}

<div class="footer">
  <span>ClienteMap — Sistema de Gestão de Particularidades</span>
  <span>Gerado em ${new Date().toLocaleString("pt-BR")}</span>
</div>
</body>
</html>`;

  // Dynamic import of puppeteer to avoid issues at build time
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
      printBackground: true,
    });

    return new Response(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="particularidades-${client.cnpjCpf.replace(/\D/g, "")}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
});
