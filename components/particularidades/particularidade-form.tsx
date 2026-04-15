"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Upload, X, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { RichTextEditor } from "./rich-text-editor";
import { cn } from "@/lib/utils";

interface Sector {
  id: string;
  name: string;
  color: string | null;
}

interface Category {
  id: string;
  name: string;
  sectorId: string;
}

interface Client {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpjCpf: string;
}

interface Props {
  sectors: Sector[];
  categories: Category[];
  clients: Client[];
  defaultClientId?: string;
  defaultSectorId?: string;
}

export function ParticularidadeForm({
  sectors,
  categories,
  clients,
  defaultClientId,
  defaultSectorId,
}: Props) {
  const router = useRouter();

  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [sectorId, setSectorId] = useState(defaultSectorId ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criticality, setCriticality] = useState("informativa");
  const [vigenciaInicio, setVigenciaInicio] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [vigenciaFim, setVigenciaFim] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const filteredCategories = categories.filter(
    (c) => !sectorId || c.sectorId === sectorId
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...newFiles].slice(0, 10));
    e.target.value = "";
  };

  const removeFile = (index: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { toast.error("Selecione um cliente"); return; }
    if (!sectorId) { toast.error("Selecione um setor"); return; }
    if (!title.trim()) { toast.error("Informe o título"); return; }
    if (!description || description === "<p></p>") {
      toast.error("Informe a descrição");
      return;
    }
    if (!vigenciaInicio) { toast.error("Informe a data de vigência início"); return; }

    setSubmitting(true);
    try {
      const body = {
        clientId,
        sectorId,
        categoryId: categoryId || undefined,
        title: title.trim(),
        description,
        criticality,
        vigenciaInicio,
        vigenciaFim: vigenciaFim || undefined,
      };

      const res = await fetch("/api/particularidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao criar particularidade");
      }

      const { data } = await res.json();

      // Upload attachments if any
      if (files.length > 0) {
        try {
          await Promise.all(
            files.map(async (file) => {
              const fd = new FormData();
              fd.append("file", file);
              const r = await fetch(`/api/particularidades/${data.id}/attachments`, {
                method: "POST",
                body: fd,
              });
              if (!r.ok) {
                const errData = await r.json().catch(() => ({}));
                throw new Error(errData.error || `Falha no upload do arquivo ${file.name}`);
              }
            })
          );
        } catch (uploadErr) {
          toast.error(uploadErr instanceof Error ? uploadErr.message : "Erro no upload de anexos.");
          // We can optionally stop here, but the particularidade is already created
          // So we should let the user see it, but inform of partial failure
        }
      }

      toast.success("Particularidade criada com sucesso");
      router.push(`/particularidades/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Back link */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          render={
            <Link
              href={
                defaultClientId
                  ? `/clients/${defaultClientId}`
                  : "/clients"
              }
            />
          }
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-5">
        <h1 className="font-semibold text-lg">Nova Particularidade</h1>

        {/* Client + Sector row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="client">Cliente *</Label>
            <select
              id="client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={cn(
                "w-full h-9 rounded-md border bg-background px-3 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-ring"
              )}
              required
            >
              <option value="">Selecionar cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nomeFantasia ?? c.razaoSocial} — {c.cnpjCpf}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sector">Setor *</Label>
            <select
              id="sector"
              value={sectorId}
              onChange={(e) => { setSectorId(e.target.value); setCategoryId(""); }}
              className={cn(
                "w-full h-9 rounded-md border bg-background px-3 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-ring"
              )}
              required
            >
              <option value="">Selecionar setor...</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category + Criticality row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="category">Categoria</Label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={filteredCategories.length === 0}
              className={cn(
                "w-full h-9 rounded-md border bg-background px-3 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-ring",
                "disabled:opacity-50"
              )}
            >
              <option value="">Sem categoria</option>
              {filteredCategories.map((c) => (
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
              className={cn(
                "w-full h-9 rounded-md border bg-background px-3 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-ring"
              )}
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
            placeholder="Resumo claro da particularidade..."
            maxLength={150}
            required
          />
          <p className="text-xs text-muted-foreground text-right">
            {title.length}/150
          </p>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label>Descrição *</Label>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="Descreva detalhadamente a particularidade..."
          />
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
              required
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
            <p className="text-xs text-muted-foreground">
              Deixe em branco para particularidade contínua
            </p>
          </div>
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <Label>Anexos</Label>
          <label
            htmlFor="file-upload"
            className={cn(
              "flex items-center gap-2 w-full cursor-pointer rounded-lg border-2 border-dashed",
              "px-4 py-3 text-sm text-muted-foreground hover:border-accent/50 hover:text-accent transition-colors"
            )}
          >
            <Upload className="h-4 w-4" />
            <span>Clique para anexar arquivos (máx. 10)</span>
            <input
              id="file-upload"
              type="file"
              multiple
              className="sr-only"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
            />
          </label>

          {files.length > 0 && (
            <ul className="space-y-1.5 mt-2">
              {files.map((file, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50"
                >
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            render={
              <Link
                href={
                  defaultClientId
                    ? `/clients/${defaultClientId}`
                    : "/clients"
                }
              />
            }
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Salvando..." : "Criar Particularidade"}
          </Button>
        </div>
      </div>
    </form>
  );
}
