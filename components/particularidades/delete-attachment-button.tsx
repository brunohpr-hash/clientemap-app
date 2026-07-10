"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

interface Props {
  particularidadeId: string;
  attachmentId: string;
  fileName: string;
}

export function DeleteAttachmentButton({
  particularidadeId,
  attachmentId,
  fileName,
}: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const deleteAction = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/particularidades/${particularidadeId}/attachments?attachmentId=${attachmentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        let errJson;
        try { errJson = await res.json(); } catch {}
        throw new Error(errJson?.error ?? "Erro ao remover anexo");
      }
    },
    onSuccess: () => {
      toast.success(`Anexo "${fileName}" removido`);
      router.refresh();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro desconhecido");
      setConfirming(false);
    },
  });

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs font-semibold text-destructive hidden sm:inline">
          Remover?
        </span>
        <Button
          variant="destructive"
          size="sm"
          className="h-7 px-2.5 text-xs"
          onClick={() => deleteAction.mutate()}
          disabled={deleteAction.isPending}
        >
          {deleteAction.isPending ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : null}
          Sim
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs"
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
      className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      onClick={() => setConfirming(true)}
      aria-label={`Remover anexo ${fileName}`}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
