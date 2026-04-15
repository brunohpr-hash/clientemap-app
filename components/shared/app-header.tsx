"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Search, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CriticalityBadge } from "@/components/particularidades/criticality-badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  referenceId?: string;
  referenceType?: string;
  isRead: boolean;
  createdAt: string;
}

interface SearchResult {
  clients: Array<{
    id: string;
    razaoSocial: string;
    nomeFantasia?: string;
    cnpjCpf: string;
    status: string;
  }>;
  particularidades: Array<{
    id: string;
    title: string;
    criticality: string;
    client: { id: string; razaoSocial: string; nomeFantasia?: string };
    sector: { name: string; color: string };
  }>;
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?unread=false");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const j = await res.json();
      return j.data as { notifications: Notification[]; unreadCount: number };
    },
    refetchInterval: 60_000, // poll every minute
  });

  const markAllRead = useMutation({
    mutationFn: () => fetch("/api/notifications", { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markOneRead = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/notifications/${id}`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border bg-popover shadow-lg">
          <div className="flex items-center justify-between p-3 border-b">
            <span className="font-semibold text-sm">Notificações</span>
            {unread > 0 && (
              <button
                className="text-xs text-accent hover:underline"
                onClick={() => markAllRead.mutate()}
              >
                Marcar todas como lida
              </button>
            )}
          </div>
          <ScrollArea className="max-h-80">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma notificação
              </p>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "px-3 py-2.5 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors",
                      !n.isRead && "bg-accent/5"
                    )}
                    onClick={() => {
                      if (!n.isRead) markOneRead.mutate(n.id);
                      if (n.referenceType === "particularidade" && n.referenceId) {
                        window.location.href = `/particularidades/${n.referenceId}`;
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {!n.isRead && (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      )}
                      <div className={cn("flex-1", n.isRead && "ml-3.5")}>
                        <p className="text-sm font-medium leading-snug">{n.title}</p>
                        {n.message && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data, isFetching } = useQuery({
    queryKey: ["search", q],
    queryFn: async () => {
      if (q.length < 2) return null;
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      return res.json().then((j) => j.data as SearchResult);
    },
    enabled: q.length >= 2,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasResults =
    data && (data.clients.length > 0 || data.particularidades.length > 0);

  return (
    <div ref={ref} className="relative w-64">
      <div className="relative">
        <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => q.length >= 2 && setOpen(true)}
          placeholder="Buscar clientes, particularidades..."
          className="pl-8 h-8 text-sm"
        />
        {q && (
          <button
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
            onClick={() => { setQ(""); setOpen(false); }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && q.length >= 2 && (
        <div className="absolute top-10 left-0 z-50 w-96 rounded-xl border bg-popover shadow-lg overflow-hidden">
          {isFetching && (
            <p className="text-sm text-muted-foreground text-center py-3">Buscando...</p>
          )}
          {!isFetching && !hasResults && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum resultado para &quot;{q}&quot;
            </p>
          )}
          {!isFetching && hasResults && (
            <ScrollArea className="max-h-96">
              {data.clients.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50">
                    Clientes
                  </p>
                  {data.clients.map((c) => (
                    <button
                      key={c.id}
                      className="w-full text-left px-3 py-2 hover:bg-muted/70 transition-colors"
                      onClick={() => {
                        router.push(`/clients/${c.id}`);
                        setOpen(false);
                        setQ("");
                      }}
                    >
                      <p className="text-sm font-medium">
                        {c.nomeFantasia ?? c.razaoSocial}
                      </p>
                      <p className="text-xs text-muted-foreground">{c.cnpjCpf}</p>
                    </button>
                  ))}
                </>
              )}
              {data.particularidades.length > 0 && (
                <>
                  <Separator />
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50">
                    Particularidades
                  </p>
                  {data.particularidades.map((p) => (
                    <button
                      key={p.id}
                      className="w-full text-left px-3 py-2 hover:bg-muted/70 transition-colors"
                      onClick={() => {
                        router.push(`/particularidades/${p.id}`);
                        setOpen(false);
                        setQ("");
                      }}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <CriticalityBadge level={p.criticality} />
                        <span
                          className="text-[10px] rounded px-1.5 py-0.5 font-medium"
                          style={{
                            background: p.sector.color + "20",
                            color: p.sector.color,
                          }}
                        >
                          {p.sector.name}
                        </span>
                      </div>
                      <p className="text-sm font-medium line-clamp-1">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.client.nomeFantasia ?? p.client.razaoSocial}
                      </p>
                    </button>
                  ))}
                </>
              )}
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}

export function AppHeader({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-6">
      {title && <h2 className="font-semibold text-sm hidden sm:block">{title}</h2>}
      <div className="flex-1" />
      <GlobalSearch />
      <NotificationBell />
    </header>
  );
}
