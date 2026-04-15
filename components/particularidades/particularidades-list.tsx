"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, ChevronDown, ChevronRight, FileText, Paperclip, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CriticalityBadge } from "./criticality-badge";
import { cn } from "@/lib/utils";

interface ParticularidadeItem {
  id: string;
  title: string;
  description: string;
  criticality: string;
  vigenciaInicio: string;
  vigenciaFim?: string | null;
  isActive: boolean;
  updatedAt: string;
  category?: { id: string; name: string } | null;
  createdByUser: { id: string; name: string };
  updatedByUser: { id: string; name: string };
  _count: { attachments: number };
}

interface Props {
  clientId: string;
  sectorId: string;
  sectorName: string;
  sectorColor: string;
  userId: string;
  userRole: string;
}

async function fetchParticularidades(
  clientId: string,
  sectorId: string,
  includeEncerradas: boolean
): Promise<ParticularidadeItem[]> {
  const params = new URLSearchParams({
    clientId,
    sectorId,
    ...(includeEncerradas ? {} : { status: "active" }),
    limit: "100",
  });
  const res = await fetch(`/api/particularidades?${params}`);
  if (!res.ok) throw new Error("Erro ao carregar particularidades");
  const json = await res.json();
  return json.data ?? [];
}

function ParticularidadeCard({ item }: { item: ParticularidadeItem }) {
  const [expanded, setExpanded] = useState(false);
  const isClosed = !item.isActive || item.vigenciaFim != null;

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        isClosed ? "bg-muted/30 opacity-70" : "bg-card",
        item.criticality === "critica" && !isClosed && "border-red-200",
        item.criticality === "atencao" && !isClosed && "border-amber-200"
      )}
    >
      <button
        className="w-full text-left p-4 flex items-start gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="mt-0.5 shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </span>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <CriticalityBadge level={item.criticality} />
            {item.category && (
              <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                {item.category.name}
              </span>
            )}
            {isClosed && (
              <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                Encerrada
              </span>
            )}
          </div>
          <p className="font-medium text-sm leading-snug">{item.title}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(item.vigenciaInicio), "dd/MM/yyyy", { locale: ptBR })}
              {item.vigenciaFim && (
                <> — {format(new Date(item.vigenciaFim), "dd/MM/yyyy", { locale: ptBR })}</>
              )}
            </span>
            {item._count.attachments > 0 && (
              <span className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                {item._count.attachments}
              </span>
            )}
          </div>
        </div>

        <Link
          href={`/particularidades/${item.id}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 text-xs text-accent hover:underline"
        >
          Ver
        </Link>
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3">
          <div
            className="text-sm text-foreground prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: item.description }}
          />
          <p className="text-xs text-muted-foreground mt-3">
            Criado por {item.createdByUser.name} · Editado por {item.updatedByUser.name} em{" "}
            {format(new Date(item.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      )}
    </div>
  );
}

export function ParticularidadesList({
  clientId,
  sectorId,
  sectorName,
  sectorColor,
  userRole,
}: Props) {
  const [showEncerradas, setShowEncerradas] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["particularidades", clientId, sectorId, showEncerradas],
    queryFn: () => fetchParticularidades(clientId, sectorId, showEncerradas),
  });

  const items = data ?? [];
  const active = items.filter((i) => i.isActive && !i.vigenciaFim);
  const closed = items.filter((i) => !i.isActive || i.vigenciaFim);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ background: sectorColor }}
          />
          <h3 className="font-semibold">{sectorName}</h3>
          {!isLoading && (
            <span className="text-sm text-muted-foreground">
              ({active.length} vigente{active.length !== 1 ? "s" : ""})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="show-encerradas"
              checked={showEncerradas}
              onCheckedChange={setShowEncerradas}
            />
            <Label htmlFor="show-encerradas" className="text-sm cursor-pointer">
              Mostrar encerradas
            </Label>
          </div>
          <Button size="sm" render={<Link href={`/particularidades/new?clientId=${clientId}&sectorId=${sectorId}`} />}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">Erro ao carregar particularidades.</p>
      )}

      {!isLoading && !error && (
        <>
          {active.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <FileText className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhuma particularidade vigente neste setor.</p>
              <Button variant="outline" size="sm" render={<Link href={`/particularidades/new?clientId=${clientId}&sectorId=${sectorId}`} />}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar primeira particularidade
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {active.map((item) => (
              <ParticularidadeCard key={item.id} item={item} />
            ))}
          </div>

          {showEncerradas && closed.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Encerradas ({closed.length})
              </p>
              {closed.map((item) => (
                <ParticularidadeCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
