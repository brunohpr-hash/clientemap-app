import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, AlertTriangle, Info } from "lucide-react";
import { verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/shared/app-header";
import { Badge } from "@/components/ui/badge";

async function getSectorsData() {
  const sectors = await prisma.sector.findMany({ orderBy: { order: "asc" } });

  const sectorStats = await Promise.all(
    sectors.map(async (sector) => {
      const clientCount = await prisma.client.count({
        where: {
          status: "active",
          responsibles: { some: { sectorId: sector.id } },
        },
      });

      const activeCount = await prisma.particularidade.count({
        where: { sectorId: sector.id, isActive: true, vigenciaFim: null },
      });

      const criticalCount = await prisma.particularidade.count({
        where: { sectorId: sector.id, isActive: true, vigenciaFim: null, criticality: "critica" },
      });

      const atencaoCount = await prisma.particularidade.count({
        where: { sectorId: sector.id, isActive: true, vigenciaFim: null, criticality: "atencao" },
      });

      const recent = await prisma.particularidade.findMany({
        where: { sectorId: sector.id, isActive: true, vigenciaFim: null },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          criticality: true,
          client: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
        },
      });

      return { sector, clientCount, activeCount, criticalCount, atencaoCount, recent };
    })
  );

  return sectorStats.filter((s) => s.activeCount > 0 || s.clientCount > 0);
}

export default async function SectorsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) redirect("/login");

  try {
    verifyAccessToken(token);
  } catch {
    redirect("/login");
  }

  const sectorStats = await getSectorsData();

  return (
    <>
      <AppHeader title="Setores" />
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <p className="text-sm text-muted-foreground">
          Visão consolidada por setor. Clique em um card para ver os clientes do setor.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sectorStats.map(({ sector, clientCount, activeCount, criticalCount, atencaoCount, recent }) => (
            <div
              key={sector.id}
              className="rounded-xl border bg-card p-5 space-y-4 hover:shadow-sm transition-shadow"
            >
              {/* Sector header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ background: sector.color ?? "#3B82F6" }}
                  />
                  <h3 className="font-semibold">{sector.name}</h3>
                </div>
                <Link
                  href={`/clients?sectorId=${sector.id}`}
                  className="flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  Ver clientes <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-lg font-bold">{clientCount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Clientes</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-lg font-bold">{activeCount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Vigentes</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: criticalCount > 0 ? "#EF444420" : undefined }}>
                  <p className={`text-lg font-bold ${criticalCount > 0 ? "text-red-600" : ""}`}>
                    {criticalCount}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Críticas</p>
                </div>
              </div>

              {/* Alert badges */}
              {(criticalCount > 0 || atencaoCount > 0) && (
                <div className="flex gap-2 flex-wrap">
                  {criticalCount > 0 && (
                    <Badge className="text-red-600 bg-red-50 dark:bg-red-950 border-red-200">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {criticalCount} crítica{criticalCount !== 1 ? "s" : ""}
                    </Badge>
                  )}
                  {atencaoCount > 0 && (
                    <Badge className="text-amber-600 bg-amber-50 dark:bg-amber-950 border-amber-200">
                      <Info className="h-3 w-3 mr-1" />
                      {atencaoCount} atenção
                    </Badge>
                  )}
                </div>
              )}

              {/* Recent items */}
              {recent.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Recentes
                  </p>
                  {recent.map((p) => (
                    <Link
                      key={p.id}
                      href={`/particularidades/${p.id}`}
                      className="flex items-start gap-2 group"
                    >
                      <span
                        className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                          p.criticality === "critica"
                            ? "bg-red-500"
                            : p.criticality === "atencao"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium line-clamp-1 group-hover:text-accent transition-colors">
                          {p.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {p.client.nomeFantasia ?? p.client.razaoSocial}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {sectorStats.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <p className="text-sm">Nenhum setor com clientes atribuídos.</p>
          </div>
        )}
      </div>
    </>
  );
}
