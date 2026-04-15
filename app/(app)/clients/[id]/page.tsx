import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Building2, Calendar, FileText } from "lucide-react";
import { ParticularidadesList } from "@/components/particularidades/particularidades-list";
import { DeleteClientButton } from "@/components/clients/delete-client-button";

const REGIME_LABELS: Record<string, string> = {
  mei: "MEI",
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload) return null;

  const accessFilter =
    payload.role === "admin"
      ? {}
      : { responsibles: { some: { userId: payload.sub } } };

  const client = await prisma.client.findFirst({
    where: { id, ...accessFilter },
    include: {
      responsibles: {
        include: {
          user: { select: { id: true, name: true } },
          sector: { select: { id: true, name: true, slug: true, color: true } },
        },
      },
    },
  });

  if (!client) notFound();

  const sectors = await prisma.sector.findMany({ orderBy: { order: "asc" } });

  // Count particularidades per sector
  const counts = await prisma.particularidade.groupBy({
    by: ["sectorId"],
    where: { clientId: id, isActive: true, vigenciaFim: null },
    _count: { id: true },
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.sectorId, c._count.id]));

  const formattedDate = client.dataInicioContabilidade
    ? new Date(client.dataInicioContabilidade).toLocaleDateString("pt-BR")
    : "—";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
            <Building2 className="h-6 w-6 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">
              {client.nomeFantasia ?? client.razaoSocial}
            </h1>
            {client.nomeFantasia && (
              <p className="text-sm text-muted-foreground">{client.razaoSocial}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline">{client.cnpjCpf}</Badge>
              <Badge variant="secondary">
                {REGIME_LABELS[client.regimeTributario] ?? client.regimeTributario}
              </Badge>
              <Badge variant={client.status === "active" ? "default" : "secondary"}>
                {client.status === "active"
                  ? "Ativo"
                  : client.status === "closing"
                  ? "Em Encerramento"
                  : "Inativo"}
              </Badge>
            </div>
          </div>
        </div>
        {payload.role === "admin" && (
          <div className="shrink-0 pt-1">
            <DeleteClientButton id={id} />
          </div>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Início da contabilidade</span>
          </div>
          <p className="font-medium mt-1">{formattedDate}</p>
        </Card>
        {client.inscricaoEstadual && (
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">IE</div>
            <p className="font-medium mt-1">{client.inscricaoEstadual}</p>
          </Card>
        )}
        {client.inscricaoMunicipal && (
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">IM</div>
            <p className="font-medium mt-1">{client.inscricaoMunicipal}</p>
          </Card>
        )}
      </div>

      {/* Observacoes */}
      {client.observacoes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" /> Observações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{client.observacoes}</p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Sector tabs */}
      <Tabs defaultValue={sectors[0]?.slug ?? ""}>
        <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap gap-1">
          {sectors.map((sector) => {
            const count = countMap[sector.id] ?? 0;
            return (
              <TabsTrigger
                key={sector.slug}
                value={sector.slug}
                className="flex items-center gap-1.5"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: sector.color ?? "#3B82F6" }}
                />
                {sector.name}
                {count > 0 && (
                  <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-xs font-medium text-accent">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {sectors.map((sector) => (
          <TabsContent key={sector.slug} value={sector.slug} className="mt-4">
            <ParticularidadesList
              clientId={id}
              sectorId={sector.id}
              sectorName={sector.name}
              sectorColor={sector.color ?? "#3B82F6"}
              userId={payload.sub}
              userRole={payload.role}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
