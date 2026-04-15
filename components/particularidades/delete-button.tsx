"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

interface Props {
  id: string;
  clientId: string;
}

export function DeleteParticularidadeButton({ id, clientId }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const deleteAction = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/particularidades/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        let errJson;
        try { errJson = await res.json(); } catch {}
        throw new Error(errJson?.error ?? "Erro ao deletar particularidade");
      }
    },
    onSuccess: () => {
      toast.success("Particularidade deletada permanentemente!");
      router.push(`/clients/${clientId}`);
      router.refresh();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro desconhecido");
      setConfirming(false);
    },
  });

  if (confirming) {
    return (
      <div className="flex items-center gap-2 bg-destructive/10 px-3 py-1 rounded-md border border-destructive/30 border-dashed animate-in fade-in zoom-in-95 duration-200">
        <span className="text-xs font-semibold text-destructive">Confirmar exclusão?</span>
        <Button
          variant="destructive"
          size="sm"
          className="h-7 px-3 text-xs shadow-sm"
          onClick={() => deleteAction.mutate()}
          disabled={deleteAction.isPending}
        >
          {deleteAction.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
          Sim
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-3 text-xs shadow-sm"
          onClick={() => setConfirming(false)}
          disabled={deleteAction.isPending}
        >
          Não
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive hover:bg-destructive hover:text-white transition-colors"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
      Excluir
    </Button>
  );
}
