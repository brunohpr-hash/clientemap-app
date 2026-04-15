"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Loader2, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "./rich-text-editor";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  sectorId: string;
}

interface ItemData {
  id: string;
  clientId: string;
  sectorId: string;
  categoryId: string;
  title: string;
  description: string;
  criticality: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  isActive: boolean;
  clientName: string;
  sectorName: string;
}

interface Props {
  item: ItemData;
  categories: Category[];
}

export function ParticularidadeEditForm({ item, categories }: Props) {
  const router = useRouter();

  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [criticality, setCriticality] = useState(item.criticality);
  const [vigenciaInicio, setVigenciaInicio] = useState(item.vigenciaInicio);
  const [vigenciaFim, setVigenciaFim] = useState(item.vigenciaFim);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Informe o título"); return; }
    if (!description || description === "<p></p>") {
      toast.error("Informe a descrição");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        categoryId: categoryId || null,
        title: title.trim(),
        description,
        criticality,
        vigenciaInicio,
        vigenciaFim: vigenciaFim || null,
      };

      const res = await fetch(`/api/particularidades/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao salvar");
      }

      toast.success("Particularidade atualizada");
      router.push(`/particularidades/${item.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!confirm("Encerrar esta particularidade? Esta ação define a vigência fim para hoje.")) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/particularidades/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vigenciaFim: today }),
      });
      if (!res.ok) throw new Error("Erro ao encerrar");
      toast.success("Particularidade encerrada");
      router.push(`/particularidades/${item.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    }
  };

  const selectClass = cn(
    "w-full h-9 rounded-md border bg-background px-3 text-sm",
    "focus:outline-none focus:ring-2 focus:ring-ring"
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          render={<Link href={`/particularidades/${item.id}`} />}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="font-semibold text-lg">Editar Particularidade</h1>
          <div className="text-xs text-muted-foreground space-x-2">
            <span className="font-medium">{item.clientName}</span>
            <span>·</span>
            <span>{item.sectorName}</span>
          </div>
        </div>

        {/* Category + Criticality */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="category">Categoria</Label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={selectClass}
            >
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="criticality">Criticidade *</Label>
            <select
              id="criticality"
              value={criticality}
              onChange={(e) => setCriticality(e.target.value)}
              className={selectClass}
            >
              <option value="informativa">Informativa</option>
              <option value="atencao">Atenção</option>
              <option value="critica">Crítica</option>
            </select>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label>Descrição *</Label>
          <RichTextEditor value={description} onChange={setDescription} />
        </div>

        {/* Vigência */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="vigenciaInicio">Vigência início *</Label>
            <Input
              id="vigenciaInicio"
              type="date"
              value={vigenciaInicio}
              onChange={(e) => setVigenciaInicio(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vigenciaFim">Vigência fim</Label>
            <Input
              id="vigenciaFim"
              type="date"
              value={vigenciaFim}
              onChange={(e) => setVigenciaFim(e.target.value)}
              min={vigenciaInicio}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {item.isActive && !item.vigenciaFim && (
            <Button
              type="button"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={handleClose}
            >
              <Archive className="h-3.5 w-3.5 mr-1.5" />
              Encerrar particularidade
            </Button>
          )}
          <div className="ml-auto flex gap-3">
            <Button
              type="button"
              variant="outline"
              render={<Link href={`/particularidades/${item.id}`} />}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : null}
              Salvar alterações
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
