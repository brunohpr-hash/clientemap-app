"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppHeader } from "@/components/shared/app-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Sector {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface ClientData {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpjCpf: string;
  inscricaoEstadual?: string | null;
  inscricaoMunicipal?: string | null;
  regimeTributario: string;
  dataInicioContabilidade?: string | null;
  status: string;
  observacoes?: string | null;
  responsibles: {
    sectorId: string;
    userId: string;
  }[];
}

export default function EditClientPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form fields
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpjCpf, setCnpjCpf] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState("");
  const [regimeTributario, setRegimeTributario] = useState("simples_nacional");
  const [status, setStatus] = useState("active");
  const [dataInicioContabilidade, setDataInicioContabilidade] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [responsibles, setResponsibles] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  // Load existing client data
  const { data: client, isLoading: loadingClient } = useQuery<ClientData>({
    queryKey: ["client", id],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) throw new Error("Cliente não encontrado");
      const j = await res.json();
      return j.data;
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

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users-select"],
    queryFn: async () => {
      const res = await fetch("/api/users?limit=200");
      const j = await res.json();
      return j.data ?? [];
    },
  });

  // Pre-fill form when client data arrives
  useEffect(() => {
    if (client && !initialized) {
      setRazaoSocial(client.razaoSocial ?? "");
      setNomeFantasia(client.nomeFantasia ?? "");
      setCnpjCpf(client.cnpjCpf ?? "");
      setInscricaoEstadual(client.inscricaoEstadual ?? "");
      setInscricaoMunicipal(client.inscricaoMunicipal ?? "");
      setRegimeTributario(client.regimeTributario ?? "simples_nacional");
      setStatus(client.status ?? "active");
      setObservacoes(client.observacoes ?? "");

      if (client.dataInicioContabilidade) {
        // Format to YYYY-MM-DD for the date input
        const d = new Date(client.dataInicioContabilidade);
        setDataInicioContabilidade(d.toISOString().split("T")[0]);
      }

      // Build responsibles map: sectorId → userId
      const respMap: Record<string, string> = {};
      for (const r of client.responsibles ?? []) {
        respMap[r.sectorId] = r.userId;
      }
      setResponsibles(respMap);
      setInitialized(true);
    }
  }, [client, initialized]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        razaoSocial: razaoSocial.trim(),
        cnpjCpf: cnpjCpf.trim(),
        regimeTributario,
        status,
        nomeFantasia: nomeFantasia.trim() || null,
        inscricaoEstadual: inscricaoEstadual.trim() || null,
        inscricaoMunicipal: inscricaoMunicipal.trim() || null,
        observacoes: observacoes.trim() || null,
      };
      if (dataInicioContabilidade) body.dataInicioContabilidade = dataInicioContabilidade;
      if (Object.keys(responsibles).length > 0) body.responsibles = responsibles;

      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error ?? "Erro ao salvar");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Dados do cliente atualizados com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["client", id] });
      router.push(`/clients/${id}`);
      router.refresh();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!razaoSocial.trim()) { toast.error("Informe a razão social"); return; }
    if (!cnpjCpf.trim()) { toast.error("Informe o CNPJ/CPF"); return; }
    saveMutation.mutate();
  };

  const selectClass = cn(
    "w-full h-9 rounded-md border bg-background px-3 text-sm",
    "focus:outline-none focus:ring-2 focus:ring-ring"
  );

  if (loadingClient) {
    return (
      <>
        <AppHeader title="Editar Cliente" />
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Editar Cliente" />
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
        <div>
          <Button variant="ghost" size="sm" render={<Link href={`/clients/${id}`} />}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar para o Cliente
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados principais */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Dados do cliente</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="razaoSocial">Razão Social *</Label>
                <Input
                  id="razaoSocial"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  placeholder="Nome empresarial completo"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                <Input
                  id="nomeFantasia"
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cnpjCpf">CNPJ / CPF *</Label>
                <Input
                  id="cnpjCpf"
                  value={cnpjCpf}
                  onChange={(e) => setCnpjCpf(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="regime">Regime Tributário *</Label>
                <select
                  id="regime"
                  value={regimeTributario}
                  onChange={(e) => setRegimeTributario(e.target.value)}
                  className={selectClass}
                >
                  <option value="mei">MEI</option>
                  <option value="simples_nacional">Simples Nacional</option>
                  <option value="lucro_presumido">Lucro Presumido</option>
                  <option value="lucro_real">Lucro Real</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status *</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={selectClass}
                >
                  <option value="active">Ativo</option>
                  <option value="closing">Em Encerramento</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ie">Inscrição Estadual</Label>
                <Input
                  id="ie"
                  value={inscricaoEstadual}
                  onChange={(e) => setInscricaoEstadual(e.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="im">Inscrição Municipal</Label>
                <Input
                  id="im"
                  value={inscricaoMunicipal}
                  onChange={(e) => setInscricaoMunicipal(e.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dataInicio">Início da Contabilidade</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataInicioContabilidade}
                  onChange={(e) => setDataInicioContabilidade(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observacoes">Observações Gerais</Label>
              <textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
                placeholder="Informações gerais sobre o cliente..."
                className={cn(selectClass, "h-auto resize-none py-2")}
              />
            </div>
          </div>

          {/* Responsáveis por setor */}
          {sectors.length > 0 && users.length > 0 && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h2 className="font-semibold">Responsáveis por setor</h2>
              <p className="text-xs text-muted-foreground">
                Atribua um colaborador responsável para cada setor. Deixe em branco para não atribuir.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sectors.map((sector) => (
                  <div key={sector.id} className="space-y-1.5">
                    <Label>{sector.name}</Label>
                    <select
                      value={responsibles[sector.id] ?? ""}
                      onChange={(e) => {
                        setResponsibles((prev) => {
                          const next = { ...prev };
                          if (e.target.value) {
                            next[sector.id] = e.target.value;
                          } else {
                            delete next[sector.id];
                          }
                          return next;
                        });
                      }}
                      className={selectClass}
                    >
                      <option value="">Não atribuído</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" render={<Link href={`/clients/${id}`} />}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <Save className="h-3.5 w-3.5 mr-1.5" />
              }
              Salvar Alterações
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
