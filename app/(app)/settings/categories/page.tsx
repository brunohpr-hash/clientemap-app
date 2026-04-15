"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppHeader } from "@/components/shared/app-header";
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
  order: number;
  isActive: boolean;
  sector: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", sectorId: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: sectors = [], isLoading: loadingSectors } = useQuery<Sector[]>({
    queryKey: ["sectors"],
    queryFn: async () => {
      const res = await fetch("/api/sectors");
      const j = await res.json();
      return j.data ?? [];
    },
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      const j = await res.json();
      return j.data ?? [];
    },
  });

  const createCategory = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          sectorId: form.sectorId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao cadastrar categoria");
      }
    },
    onSuccess: () => {
      toast.success("Categoria cadastrada com sucesso!");
      setForm({ name: "", sectorId: "" });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro desconhecido");
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao deletar categoria");
      }
    },
    onSuccess: () => {
      toast.success("Categoria deletada!");
      setConfirmDeleteId(null);
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao deletar categoria");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Informe o nome da categoria");
    if (!form.sectorId) return toast.error("Selecione um setor");
    createCategory.mutate();
  };

  const isLoading = loadingSectors || loadingCategories;

  // Group categories by sector
  const categoriesBySector = categories.reduce((acc, cat) => {
    if (!acc[cat.sectorId]) {
      acc[cat.sectorId] = {
        sectorName: cat.sector.name,
        color: sectors.find(s => s.id === cat.sectorId)?.color,
        items: []
      };
    }
    acc[cat.sectorId].items.push(cat);
    return acc;
  }, {} as Record<string, { sectorName: string, color?: string | null, items: Category[] }>);

  return (
    <>
      <AppHeader title="Categorias" />
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-8">
        
        {/* Formulário de Nova Categoria */}
        <div className="rounded-xl border bg-card p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Tags className="h-5 w-5 text-accent" />
            <h2 className="font-semibold text-lg">Nova Categoria</h2>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-5 space-y-1.5">
              <Label htmlFor="cat-name">Nome da Categoria *</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Exibilidade Fiscal, Obrigatoriedade, etc."
                maxLength={200}
              />
            </div>
            <div className="sm:col-span-4 space-y-1.5">
              <Label htmlFor="cat-sector">Setor *</Label>
              <select
                id="cat-sector"
                value={form.sectorId}
                onChange={(e) => setForm((f) => ({ ...f, sectorId: e.target.value }))}
                className={cn(
                  "w-full h-9 rounded-md border bg-background px-3 text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-ring"
                )}
              >
                <option value="">Selecione...</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3 pb-[1px]">
              <Button type="submit" disabled={createCategory.isPending} className="w-full">
                {createCategory.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1.5" />
                )}
                Adicionar
              </Button>
            </div>
          </form>
        </div>

        {/* Listagem de Categorias */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Categorias cadastradas</h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-muted/10">
              <p className="text-muted-foreground text-sm">Nenhuma categoria cadastrada ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {Object.entries(categoriesBySector).map(([sectorId, group]) => (
                <div key={sectorId} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: group.color ?? '#3B82F6' }} 
                    />
                    <h3 className="font-medium text-sm">{group.sectorName}</h3>
                  </div>
                  <div className="rounded-xl border overflow-hidden bg-card">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome da Categoria</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground w-20">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((cat, i) => (
                          <tr key={cat.id} className={cn("transition-colors", i > 0 && "border-t")}>
                            <td className="px-4 py-3 font-medium">{cat.name}</td>
                            <td className="px-4 py-3 text-right">
                              {confirmDeleteId === cat.id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-destructive font-medium mr-1">Deletar?</span>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => deleteCategory.mutate(cat.id)}
                                    disabled={deleteCategory.isPending}
                                  >
                                    {deleteCategory.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sim"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => setConfirmDeleteId(null)}
                                    disabled={deleteCategory.isPending}
                                  >
                                    Não
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  title="Deletar categoria"
                                  onClick={() => setConfirmDeleteId(cat.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
