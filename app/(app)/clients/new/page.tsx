"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppHeader } from "@/components/shared/app-header";
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

export default function NewClientPage() {
  const router = useRouter();

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
  // responsibles: sectorId → userId
  const [responsibles, setResponsibles] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!razaoSocial.trim()) { toast.error("Informe a razão social"); return; }
    if (!cnpjCpf.trim()) { toast.error("Informe o CNPJ/CPF"); return; }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        razaoSocial: razaoSocial.trim(),
        cnpjCpf: cnpjCpf.trim(),
        regimeTributario,
        status,
      };
      if (nomeFantasia.trim()) body.nomeFantasia = nomeFantasia.trim();
      if (inscricaoEstadual.trim()) body.inscricaoEstadual = inscricaoEstadual.trim();
      if (inscricaoMunicipal.trim()) body.inscricaoMunicipal = inscricaoMunicipal.trim();
      if (dataInicioContabilidade) body.dataInicioContabilidade = dataInicioContabilidade;
      if (observacoes.trim()) body.observacoes = observacoes.trim();
      if (Object.keys(responsibles).length > 0) body.responsibles = responsibles;

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao criar cliente");
      }

      const { data } = await res.json();
      toast.success("Cliente criado com sucesso");
      router.push(`/clients/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  };

  const selectClass = cn(
    "w-full h-9 rounded-md border bg-background px-3 text-sm",
    "focus:outline-none focus:ring-2 focus:ring-ring"
  );

  return (
    <>
      <AppHeader title="Novo Cliente" />
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
        <div>
          <Button variant="ghost" size="sm" render={<Link href="/clients" />}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar para Clientes
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
            <Button type="button" variant="outline" render={<Link href="/clients" />}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Criar Cliente
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
