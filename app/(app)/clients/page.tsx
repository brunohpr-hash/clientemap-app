import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Plus, Search } from "lucide-react";

const REGIME_LABELS: Record<string, string> = {
  mei: "MEI",
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
};

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  inactive: { label: "Inativo", variant: "secondary" },
  closing: { label: "Em Encerramento", variant: "outline" },
};

interface SearchParams {
  q?: string;
  status?: string;
  page?: string;
}

async function ClientList({ searchParams }: { searchParams: SearchParams }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload) return null;

  const q = searchParams.q ?? "";
  const status = searchParams.status;
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const take = 20;
  const skip = (page - 1) * take;

  const accessFilter =
    payload.role === "admin"
      ? {}
      : { responsibles: { some: { userId: payload.sub } } };

  const where: Record<string, unknown> = { ...accessFilter };
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { razaoSocial: { contains: q, mode: "insensitive" } },
      { nomeFantasia: { contains: q, mode: "insensitive" } },
      { cnpjCpf: { contains: q } },
    ];
  }

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take,
      orderBy: { razaoSocial: "asc" },
      select: {
        id: true,
        razaoSocial: true,
        nomeFantasia: true,
        cnpjCpf: true,
        regimeTributario: true,
        status: true,
        _count: {
          select: {
            particularidades: { where: { isActive: true, vigenciaFim: null } },
          },
        },
      },
    }),
    prisma.client.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden md:table-cell">CNPJ/CPF</TableHead>
              <TableHead className="hidden lg:table-cell">Regime</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Particularidades</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => {
                const statusInfo = STATUS_LABELS[client.status] ?? STATUS_LABELS.active;
                return (
                  <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/clients/${client.id}`} className="block">
                        <p className="font-medium leading-tight">
                          {client.nomeFantasia ?? client.razaoSocial}
                        </p>
                        {client.nomeFantasia && (
                          <p className="text-xs text-muted-foreground truncate">
                            {client.razaoSocial}
                          </p>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {client.cnpjCpf}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {REGIME_LABELS[client.regimeTributario] ?? client.regimeTributario}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-medium">
                        {client._count.particularidades}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} cliente(s) encontrado(s)</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" render={<Link href={`/clients?q=${q}&page=${page - 1}`} />}>
                Anterior
              </Button>
            )}
            <span className="self-center">Pág. {page}/{totalPages}</span>
            {page < totalPages && (
              <Button variant="outline" size="sm" render={<Link href={`/clients?q=${q}&page=${page + 1}`} />}>
                Próxima
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolved = await searchParams;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-accent" />
            Clientes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie a carteira de clientes
          </p>
        </div>
        <Button render={<Link href="/clients/new" />}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={resolved.q ?? ""}
            placeholder="Buscar por nome ou CNPJ..."
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">Buscar</Button>
      </form>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <ClientList searchParams={resolved} />
      </Suspense>
    </div>
  );
}
