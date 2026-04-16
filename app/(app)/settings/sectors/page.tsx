"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Layers, Check, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppHeader } from "@/components/shared/app-header";

interface Sector {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  order: number;
  isDefault: boolean;
  _count?: { particularidades: number };
}

const PRESET_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
  "#F97316", "#6366F1",
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="h-7 w-7 rounded-full border-2 transition-all"
          style={{
            background: c,
            borderColor: value === c ? "#000" : "transparent",
            outline: value === c ? "2px solid " + c : "none",
            outlineOffset: "2px",
          }}
          title={c}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-7 rounded-full cursor-pointer border border-border p-0.5"
        title="Cor personalizada"
      />
    </div>
  );
}

export default function SectorsSettingsPage() {
  const qc = useQueryClient();

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3B82F6");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: sectors = [], isLoading } = useQuery<Sector[]>({
    queryKey: ["sectors-admin"],
    queryFn: async () => {
      const res = await fetch("/api/sectors");
      const j = await res.json();
      return j.data as Sector[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/sectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "Erro ao criar setor");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sectors-admin"] });
      qc.invalidateQueries({ queryKey: ["sectors"] });
      setNewName("");
      setNewColor("#3B82F6");
      setCreating(false);
      toast.success("Setor criado com sucesso");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const res = await fetch(`/api/sectors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "Erro ao salvar");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sectors-admin"] });
      qc.invalidateQueries({ queryKey: ["sectors"] });
      setEditingId(null);
      toast.success("Setor atualizado");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sectors/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "Erro ao remover");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sectors-admin"] });
      qc.invalidateQueries({ queryKey: ["sectors"] });
      setConfirmDeleteId(null);
      toast.success("Setor removido");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const startEdit = (s: Sector) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditColor(s.color ?? "#3B82F6");
    setConfirmDeleteId(null);
  };

  const cancelEdit = () => setEditingId(null);

  return (
    <>
      <AppHeader title="Setores" />
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {/* Back */}
        <Button type="button" variant="ghost" size="sm" render={<Link href="/settings" />}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Configurações
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-600" />
              Setores
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie os setores disponíveis no sistema
            </p>
          </div>
          {!creating && (
            <Button size="sm" onClick={() => { setCreating(true); setEditingId(null); }}>
              <Plus className="h-4 w-4 mr-1.5" />
              Novo setor
            </Button>
          )}
        </div>

        {/* Create form */}
        {creating && (
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="font-semibold text-sm">Novo setor</h2>
            <div className="space-y-1.5">
              <Label htmlFor="new-name">Nome *</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Recursos Humanos"
                maxLength={100}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <ColorPicker value={newColor} onChange={setNewColor} />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setCreating(false); setNewName(""); setNewColor("#3B82F6"); }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={!newName.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                )}
                Criar setor
              </Button>
            </div>
          </div>
        )}

        {/* Sectors list */}
        <div className="rounded-xl border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : sectors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Nenhum setor cadastrado.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {sectors.map((sector) => (
                <li key={sector.id} className="p-4">
                  {editingId === sector.id ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label>Nome</Label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={100}
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Cor</Label>
                        <ColorPicker value={editColor} onChange={setEditColor} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                          <X className="h-3.5 w-3.5 mr-1" />
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          disabled={!editName.trim() || updateMutation.isPending}
                          onClick={() =>
                            updateMutation.mutate({ id: sector.id, name: editName, color: editColor })
                          }
                        >
                          {updateMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="h-4 w-4 rounded-full shrink-0"
                          style={{ background: sector.color ?? "#3B82F6" }}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{sector.name}</p>
                          <p className="text-xs text-muted-foreground">{sector.color}</p>
                        </div>
                        {sector.isDefault && (
                          <span className="text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5 shrink-0">
                            padrão
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {confirmDeleteId === sector.id ? (
                          <>
                            <span className="text-xs text-muted-foreground">Confirmar remoção?</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deleteMutation.isPending}
                              onClick={() => deleteMutation.mutate(sector.id)}
                            >
                              {deleteMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                "Sim"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Não
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(sector)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {!sector.isDefault && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  setConfirmDeleteId(sector.id);
                                  setEditingId(null);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Setores marcados como <strong>padrão</strong> não podem ser removidos.
          Setores com particularidades cadastradas também não podem ser removidos.
        </p>
      </div>
    </>
  );
}
