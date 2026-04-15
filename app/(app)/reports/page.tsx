"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AppHeader } from "@/components/shared/app-header";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpjCpf: string;
}

interface Sector {
  id: string;
  name: string;
}

function ReportsPage() {
  const [clientId, setClientId] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [criticality, setCriticality] = useState("");
  const [status, setStatus] = useState("active");
  const [downloading, setDownloading] = useState<"pdf" | "csv" | null>(null);

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients-select"],
    queryFn: async () => {
      const res = await fetch("/api/clients?limit=500&status=active");
      const j = await res.json();
      return j.data ?? [];
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

  const buildParams = () => {
    const p = new URLSearchParams();
    if (clientId) p.set("clientId", clientId);
    if (sectorId) p.set("sectorId", sectorId);
    if (criticality) p.set("criticality", criticality);
    if (status) p.set("status", status);
    return p.toString();
  };

  const downloadCsv = async () => {
    if (!clientId && !sectorId) {
      toast.info("Selecione ao menos um cliente ou setor para o relatório.");
    }
    setDownloading("csv");
    try {
      const res = await fetch(`/api/reports/csv?${buildParams()}`);
      if (!res.ok) throw new Error("Erro ao gerar CSV");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `particularidades-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV gerado com sucesso");
    } catch {
      toast.error("Erro ao gerar relatório CSV");
    } finally {
      setDownloading(null);
    }
  };

  const downloadPdf = async () => {
    if (!clientId) {
      toast.error("Selecione um cliente para gerar o PDF");
      return;
    }
    setDownloading("pdf");
    try {
      const res = await fetch(`/api/reports/pdf?${buildParams()}`);
      if (!res.ok) throw new Error("Erro ao gerar PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `particularidades-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF gerado com sucesso");
    } catch {
      toast.error("Erro ao gerar PDF");
    } finally {
      setDownloading(null);
    }
  };

  const selectClass = cn(
    "w-full h-9 rounded-md border bg-background px-3 text-sm",
    "focus:outline-none focus:ring-2 focus:ring-ring"
  );

  return (
    <>
      <AppHeader title="Relatórios" />
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        <div className="rounded-xl border bg-card p-6 space-y-5">
          <h2 className="font-semibold">Filtros do relatório</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={selectClass}
              >
                <option value="">Todos os clientes</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nomeFantasia ?? c.razaoSocial}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Setor</Label>
              <select
                value={sectorId}
                onChange={(e) => setSectorId(e.target.value)}
                className={selectClass}
              >
                <option value="">Todos os setores</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Criticidade</Label>
              <select
                value={criticality}
                onChange={(e) => setCriticality(e.target.value)}
                className={selectClass}
              >
                <option value="">Todas</option>
                <option value="critica">Crítica</option>
                <option value="atencao">Atenção</option>
                <option value="informativa">Informativa</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={selectClass}
              >
                <option value="active">Vigentes</option>
                <option value="closed">Encerradas</option>
                <option value="all">Todas</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* CSV Card */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">Exportar CSV</p>
                <p className="text-xs text-muted-foreground">Compatível com Excel</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Exporta todas as particularidades filtradas em formato CSV com codificação UTF-8 (BOM).
            </p>
            <Button
              className="w-full"
              variant="outline"
              onClick={downloadCsv}
              disabled={downloading !== null}
            >
              {downloading === "csv" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Baixar CSV
            </Button>
          </div>

          {/* PDF Card */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">Ficha PDF</p>
                <p className="text-xs text-muted-foreground">Para envio ao cliente</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Gera a ficha de particularidades do cliente selecionado em PDF formatado.{" "}
              <strong>Requer um cliente selecionado.</strong>
            </p>
            <Button
              className="w-full"
              variant="outline"
              onClick={downloadPdf}
              disabled={downloading !== null || !clientId}
            >
              {downloading === "pdf" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Baixar PDF
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Exportações são limitadas a 5.000 registros por vez.
        </p>
      </div>
    </>
  );
}

export default ReportsPage;
