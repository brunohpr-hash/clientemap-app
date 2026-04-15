import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, AlertTriangle, AlertCircle, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth";

async function getDashboardStats(userId: string, role: string) {
  const isAdmin = role === "admin";

  // For collaborators, scope to their sector clients
  const userSectors = isAdmin
    ? null
    : await prisma.userSector.findMany({
        where: { userId },
        select: { sectorId: true },
      });

  const sectorIds = userSectors?.map((s: { sectorId: string }) => s.sectorId);

  const clientWhere = isAdmin
    ? { status: "active" as const }
    : {
        status: "active" as const,
        responsibles: { some: { userId, sectorId: { in: sectorIds } } },
      };

  const [totalClients, critCount, atencaoCount, sectors, recent] =
    await Promise.all([
      prisma.client.count({ where: clientWhere }),
      prisma.particularidade.count({
        where: {
          criticality: "critica",
          isActive: true,
          vigenciaFim: null,
          client: clientWhere,
          ...(sectorIds ? { sectorId: { in: sectorIds } } : {}),
        },
      }),
      prisma.particularidade.count({
        where: {
          criticality: "atencao",
          isActive: true,
          vigenciaFim: null,
          client: clientWhere,
          ...(sectorIds ? { sectorId: { in: sectorIds } } : {}),
        },
      }),
      prisma.sector.findMany({ orderBy: { order: "asc" } }),
      prisma.particularidade.findMany({
        where: {
          isActive: true,
          client: clientWhere,
          ...(sectorIds ? { sectorId: { in: sectorIds } } : {}),
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: {
          id: true,
          title: true,
          criticality: true,
          updatedAt: true,
          client: { select: { razaoSocial: true, nomeFantasia: true } },
          sector: { select: { name: true, color: true } },
          updatedByUser: { select: { name: true } },
        },
      }),
    ]);

  return { totalClients, critCount, atencaoCount, sectors, recent };
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const payload = token ? verifyAccessToken(token) : null;

  if (!payload) return null;

  const { totalClients, critCount, atencaoCount, recent } =
    await getDashboardStats(payload.sub, payload.role);

  const stats = [
    {
      title: "Clientes Ativos",
      value: totalClients,
      icon: Building2,
      color: "text-accent",
    },
    {
      title: "Particularidades Críticas",
      value: critCount,
      icon: AlertTriangle,
      color: "text-red-500",
    },
    {
      title: "Requerem Atenção",
      value: atencaoCount,
      icon: AlertCircle,
      color: "text-amber-500",
    },
    {
      title: "Atualizadas Hoje",
      value: recent.filter(
        (r: { updatedAt: Date }) => r.updatedAt.toDateString() === new Date().toDateString()
      ).length,
      icon: Clock,
      color: "text-emerald-500",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visão geral das particularidades da carteira
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ title, value, icon: Icon, color }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma particularidade registrada ainda.
            </p>
          ) : (
            <ul className="space-y-3">
              {recent.map((item: typeof recent[number]) => (
                <li key={item.id} className="flex items-start gap-3 text-sm">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full criticality-dot-${item.criticality}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-muted-foreground text-xs truncate">
                      {item.client.nomeFantasia ?? item.client.razaoSocial} ·{" "}
                      {item.sector.name} · por {item.updatedByUser.name}
                    </p>
                  </div>
                  <time className="text-xs text-muted-foreground shrink-0">
                    {new Date(item.updatedAt).toLocaleDateString("pt-BR")}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
