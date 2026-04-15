"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  UserPlus, Pencil, PowerOff, Power, Loader2, X, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/shared/app-header";
import { cn } from "@/lib/utils";

interface Sector {
  id: string;
  name: string;
  color: string | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  sectors: Sector[];
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
  sectorIds: string[];
}

function UserDialog({
  user,
  sectors,
  onClose,
}: {
  user: User | null;
  sectors: Sector[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = user !== null;

  const [form, setForm] = useState<UserFormData>({
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    role: user?.role ?? "collaborator",
    sectorIds: user?.sectors.map((s) => s.id) ?? [],
  });
  const [saving, setSaving] = useState(false);

  const toggleSector = (id: string) =>
    setForm((f) => ({
      ...f,
      sectorIds: f.sectorIds.includes(id)
        ? f.sectorIds.filter((s) => s !== id)
        : [...f.sectorIds, id],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Informe o nome"); return; }
    if (!form.email.trim()) { toast.error("Informe o e-mail"); return; }
    if (!isEdit && !form.password) { toast.error("Informe a senha"); return; }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        sectorIds: form.sectorIds,
      };
      if (form.password) body.password = form.password;

      const res = await fetch(
        isEdit ? `/api/users/${user.id}` : "/api/users",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao salvar");
      }

      toast.success(isEdit ? "Usuário atualizado" : "Usuário criado");
      qc.invalidateQueries({ queryKey: ["users"] });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSaving(false);
    }
  };

  const selectClass = cn(
    "w-full h-9 rounded-md border bg-background px-3 text-sm",
    "focus:outline-none focus:ring-2 focus:ring-ring"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold">
            {isEdit ? "Editar usuário" : "Novo usuário"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="u-name">Nome *</Label>
            <Input
              id="u-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nome completo"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="u-email">E-mail *</Label>
            <Input
              id="u-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="email@empresa.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="u-password">
              Senha {isEdit && <span className="text-muted-foreground">(deixe em branco para não alterar)</span>}
            </Label>
            <Input
              id="u-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={isEdit ? "••••••••" : "Mínimo 8 caracteres"}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Perfil *</Label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className={selectClass}
            >
              <option value="collaborator">Colaborador</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {form.role === "collaborator" && (
            <div className="space-y-2">
              <Label>Setores de atuação</Label>
              <div className="flex flex-wrap gap-2">
                {sectors.map((s) => {
                  const active = form.sectorIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSector(s.id)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors",
                        active
                          ? "border-transparent text-white"
                          : "border-border text-muted-foreground hover:border-accent/50"
                      )}
                      style={active ? { background: s.color ?? "#3B82F6" } : {}}
                    >
                      {active && <Check className="h-3 w-3" />}
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              {isEdit ? "Salvar" : "Criar usuário"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UsersPage() {
  const [dialogUser, setDialogUser] = useState<User | null | undefined>(undefined);
  const qc = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users?limit=100");
      const j = await res.json();
      return j.data as User[];
    },
  });

  const { data: sectors = [] } = useQuery<Sector[]>({
    queryKey: ["sectors"],
    queryFn: async () => {
      const res = await fetch("/api/sectors");
      const j = await res.json();
      return j.data ?? [];
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "active" ? "inactive" : "active";
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar status");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Status atualizado");
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const users = usersData ?? [];

  return (
    <>
      <AppHeader title="Usuários" />
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {users.length} usuário{users.length !== 1 ? "s" : ""}
          </p>
          <Button size="sm" onClick={() => setDialogUser(null)}>
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Novo usuário
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && (
          <div className="rounded-xl border overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuário</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Setores</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Perfil</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr
                    key={u.id}
                    className={cn("transition-colors", i > 0 && "border-t")}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {u.sectors.length === 0 && u.role !== "admin" ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : u.role === "admin" ? (
                          <span className="text-xs text-muted-foreground">Todos</span>
                        ) : (
                          u.sectors.map((s) => (
                            <span
                              key={s.id}
                              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{
                                background: (s.color ?? "#3B82F6") + "20",
                                color: s.color ?? "#3B82F6",
                              }}
                            >
                              {s.name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                        {u.role === "admin" ? "Admin" : "Colaborador"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={u.status === "active" ? "default" : "secondary"}
                        className={cn(
                          u.status === "active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {u.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Editar"
                          onClick={() => setDialogUser(u)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={u.status === "active" ? "Desativar" : "Ativar"}
                          onClick={() => toggleStatus.mutate({ id: u.id, status: u.status })}
                          disabled={toggleStatus.isPending}
                        >
                          {u.status === "active" ? (
                            <PowerOff className="h-3.5 w-3.5 text-destructive" />
                          ) : (
                            <Power className="h-3.5 w-3.5 text-emerald-600" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialogUser !== undefined && (
        <UserDialog
          user={dialogUser}
          sectors={sectors}
          onClose={() => setDialogUser(undefined)}
        />
      )}
    </>
  );
}

export default UsersPage;
