import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Paperclip, Clock, User, Edit } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CriticalityBadge } from "@/components/particularidades/criticality-badge";
import { AppHeader } from "@/components/shared/app-header";
import { DeleteParticularidadeButton } from "@/components/particularidades/delete-button";
import { cn } from "@/lib/utils";

async function getParticularidade(id: string) {
  return prisma.particularidade.findFirst({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      sector: { select: { id: true, name: true, slug: true, color: true } },
      client: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
      createdByUser: { select: { id: true, name: true } },
      updatedByUser: { select: { id: true, name: true } },
      attachments: {
        select: {
          id: true,
          originalName: true,
          fileUrl: true,
          fileSize: true,
          mimeType: true,
          createdAt: true,
          uploader: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      history: {
        orderBy: { performedAt: "desc" },
        take: 50,
        select: {
          id: true,
          action: true,
          changedFields: true,
          oldValues: true,
          newValues: true,
          performedAt: true,
          performer: { select: { id: true, name: true } },
        },
      },
    },
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function actionLabel(action: string) {
  switch (action) {
    case "created": return "Criada";
    case "updated": return "Editada";
    case "closed": return "Encerrada";
    case "reactivated": return "Reativada";
    default: return action;
  }
}

function actionColor(action: string) {
  switch (action) {
    case "created": return "text-emerald-600 bg-emerald-50";
    case "closed": return "text-red-600 bg-red-50";
    case "reactivated": return "text-blue-600 bg-blue-50";
    default: return "text-amber-600 bg-amber-50";
  }
}

const FIELD_LABELS: Record<string, string> = {
  title: "Título",
  description: "Descrição",
  criticality: "Criticidade",
  vigenciaInicio: "Vigência início",
  vigenciaFim: "Vigência fim",
  isActive: "Status",
  categoryId: "Categoria",
};

const CRITICALITY_LABELS: Record<string, string> = {
  informativa: "Informativa",
  atencao: "Atenção",
  critica: "Crítica",
};

export default async function ParticularidadePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) redirect("/login");

  let userId: string;
  let userRole: string;
  try {
    const payload = verifyAccessToken(token);
    userId = payload.sub;
    userRole = payload.role;
  } catch {
    redirect("/login");
  }

  const item = await getParticularidade(id);
  if (!item) notFound();

  const isClosed = !item.isActive || item.vigenciaFim != null;
  const clientName = item.client.nomeFantasia ?? item.client.razaoSocial;

  return (
    <>
      <AppHeader title={item.title} />
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/clients" className="hover:text-foreground transition-colors">
            Clientes
          </Link>
          <span>/</span>
          <Link
            href={`/clients/${item.client.id}`}
            className="hover:text-foreground transition-colors"
          >
            {clientName}
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium line-clamp-1 max-w-xs">
            {item.title}
          </span>
        </div>

        {/* Header card */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CriticalityBadge level={item.criticality} />
                <span
                  className="text-xs rounded px-2 py-0.5 font-medium"
                  style={{
                    background: (item.sector.color ?? "#3B82F6") + "20",
                    color: item.sector.color ?? "#3B82F6",
                  }}
                >
                  {item.sector.name}
                </span>
                {item.category && (
                  <span className="text-xs text-muted-foreground bg-muted rounded px-2 py-0.5">
                    {item.category.name}
                  </span>
                )}
                {isClosed && (
                  <Badge variant="secondary">Encerrada</Badge>
                )}
              </div>
              <h1 className="text-xl font-bold">{item.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              {userRole === "admin" && (
                <DeleteParticularidadeButton id={item.id} clientId={item.clientId} />
              )}
              <Button
                size="sm"
                variant="outline"
                render={
                  <Link href={`/particularidades/${id}/edit`} />
                }
              >
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Editar
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Cliente</p>
              <Link
                href={`/clients/${item.client.id}`}
                className="font-medium text-accent hover:underline"
              >
                {clientName}
              </Link>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Vigência início</p>
              <p className="font-medium">
                {format(new Date(item.vigenciaInicio), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Vigência fim</p>
              <p className="font-medium">
                {item.vigenciaFim
                  ? format(new Date(item.vigenciaFim), "dd/MM/yyyy", { locale: ptBR })
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Última edição</p>
              <p className="font-medium">
                {format(new Date(item.updatedAt), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs text-muted-foreground mb-2">Descrição</p>
            <div
              className="prose prose-sm max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: item.description }}
            />
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Criado por {item.createdByUser.name}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(item.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        </div>

        {/* Attachments */}
        {item.attachments.length > 0 && (
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Anexos ({item.attachments.length})
            </h2>
            <div className="space-y-2">
              {item.attachments.map((a) => (
                <a
                  key={a.id}
                  href={a.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">
                      {a.originalName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(a.fileSize)} · {a.uploader.name} ·{" "}
                      {format(new Date(a.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-sm">Histórico de alterações</h2>
          {item.history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro.</p>
          ) : (
            <ol className="relative border-l border-border ml-3 space-y-4">
              {item.history.map((h) => {
                const changedFields = Array.isArray(h.changedFields)
                  ? (h.changedFields as string[])
                  : [];
                const oldVals = (h.oldValues as Record<string, unknown>) ?? {};
                const newVals = (h.newValues as Record<string, unknown>) ?? {};

                return (
                  <li key={h.id} className="ml-4">
                    <span
                      className={cn(
                        "absolute -left-1.5 mt-0.5 h-3 w-3 rounded-full border-2 border-background",
                        h.action === "created" ? "bg-emerald-500" :
                        h.action === "closed" ? "bg-red-500" :
                        h.action === "reactivated" ? "bg-blue-500" :
                        "bg-amber-500"
                      )}
                    />
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          "text-xs font-semibold px-1.5 py-0.5 rounded",
                          actionColor(h.action)
                        )}
                      >
                        {actionLabel(h.action)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        por {h.performer.name} ·{" "}
                        {format(new Date(h.performedAt), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    {changedFields.length > 0 && (
                      <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                        {changedFields.map((field) => {
                          const label = FIELD_LABELS[field] ?? field;
                          let oldDisplay = String(oldVals[field] ?? "");
                          let newDisplay = String(newVals[field] ?? "");
                          if (field === "criticality") {
                            oldDisplay = CRITICALITY_LABELS[oldDisplay] ?? oldDisplay;
                            newDisplay = CRITICALITY_LABELS[newDisplay] ?? newDisplay;
                          }
                          if (field === "description") {
                            oldDisplay = oldDisplay.replace(/<[^>]*>/g, " ").substring(0, 60) + "...";
                            newDisplay = newDisplay.replace(/<[^>]*>/g, " ").substring(0, 60) + "...";
                          }
                          return (
                            <li key={field}>
                              <span className="font-medium text-foreground">{label}:</span>{" "}
                              <span className="line-through opacity-60">{oldDisplay || "—"}</span>
                              {" → "}
                              <span>{newDisplay || "—"}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </>
  );
}
