"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/shared/app-header";
import { cn } from "@/lib/utils";

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

function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "page"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?unread=false&limit=100");
      const j = await res.json();
      return j.data as { notifications: Notification[]; unreadCount: number };
    },
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

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const displayed =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const handleClick = (n: Notification) => {
    if (!n.isRead) markOneRead.mutate(n.id);
    if (n.referenceType === "particularidade" && n.referenceId) {
      window.location.href = `/particularidades/${n.referenceId}`;
    }
  };

  return (
    <>
      <AppHeader title="Notificações" />
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border overflow-hidden">
              <button
                className={cn(
                  "px-3 py-1.5 text-sm transition-colors",
                  filter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
                onClick={() => setFilter("all")}
              >
                Todas
              </button>
              <button
                className={cn(
                  "px-3 py-1.5 text-sm transition-colors border-l",
                  filter === "unread"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
                onClick={() => setFilter("unread")}
              >
                Não lidas
                {unreadCount > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              {markAllRead.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              )}
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && displayed.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Bell className="h-10 w-10 opacity-20" />
            <p className="text-sm">
              {filter === "unread"
                ? "Nenhuma notificação não lida"
                : "Nenhuma notificação"}
            </p>
          </div>
        )}

        {!isLoading && displayed.length > 0 && (
          <div className="rounded-xl border overflow-hidden bg-card">
            {displayed.map((n, i) => (
              <button
                key={n.id}
                className={cn(
                  "w-full text-left px-5 py-4 transition-colors hover:bg-muted/50",
                  i > 0 && "border-t",
                  !n.isRead && "bg-accent/5"
                )}
                onClick={() => handleClick(n)}
              >
                <div className="flex items-start gap-3">
                  {!n.isRead && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  )}
                  <div className={cn("flex-1 min-w-0", n.isRead && "ml-5")}>
                    <p className="font-medium text-sm">{n.title}</p>
                    {n.message && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {n.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-1.5">
                      {formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  {n.referenceType === "particularidade" && n.referenceId && (
                    <span className="text-xs text-accent shrink-0">Ver →</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default NotificationsPage;
