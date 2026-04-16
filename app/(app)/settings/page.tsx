"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Loader2, Users, ArrowRight, Tags, Layers } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppHeader } from "@/components/shared/app-header";

type SettingsMap = Record<string, string | number | boolean | null>;

function SettingsPage() {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery<SettingsMap>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      const j = await res.json();
      return j.data as SettingsMap;
    },
  });

  const [companyName, setCompanyName] = useState("");
  const [alertDays, setAlertDays] = useState("30");
  const [maxAttachmentMb, setMaxAttachmentMb] = useState("20");

  useEffect(() => {
    if (settings) {
      setCompanyName(String(settings.company_name ?? ""));
      setAlertDays(String(settings.alert_days_before_vigencia ?? "30"));
      setMaxAttachmentMb(String(settings.max_attachment_mb ?? "20"));
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        company_name: companyName.trim(),
        alert_days_before_vigencia: parseInt(alertDays, 10) || 30,
        max_attachment_mb: parseInt(maxAttachmentMb, 10) || 20,
      };
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao salvar");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Configurações salvas");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro"),
  });

  return (
    <>
      <AppHeader title="Configurações" />
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">

        {/* Quick nav */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/settings/users"
            className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Usuários</p>
                <p className="text-xs text-muted-foreground">Gerenciar colaboradores e admins</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
          <Link
            href="/settings/categories"
            className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
                <Tags className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="font-medium text-sm">Categorias</p>
                <p className="text-xs text-muted-foreground">Cadastrar e gerenciar categorias</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
          <Link
            href="/settings/sectors"
            className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Layers className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Setores</p>
                <p className="text-xs text-muted-foreground">Cadastrar e gerenciar setores</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        </div>

        {/* System settings form */}
        <div className="rounded-xl border bg-card p-6 space-y-5">
          <h2 className="font-semibold">Configurações do sistema</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="company-name">Nome da empresa</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Contabilidade Exemplo Ltda."
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">
                  Exibido nos relatórios PDF.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="alert-days">
                  Dias de antecedência para alertas de vigência
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="alert-days"
                    type="number"
                    min={1}
                    max={365}
                    value={alertDays}
                    onChange={(e) => setAlertDays(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">dias</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Notificações são enviadas quando a vigência fim de uma particularidade
                  estiver dentro deste prazo.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="max-attachment">Tamanho máximo de anexo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="max-attachment"
                    type="number"
                    min={1}
                    max={100}
                    value={maxAttachmentMb}
                    onChange={(e) => setMaxAttachmentMb(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">MB</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Salvar configurações
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default SettingsPage;
