"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  particularidadeId: string;
}

export function AddAttachmentButton({ particularidadeId }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setUploading(true);
    let okCount = 0;
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(
          `/api/particularidades/${particularidadeId}/attachments`,
          { method: "POST", body: fd }
        );
        if (!res.ok) {
          let errJson;
          try { errJson = await res.json(); } catch {}
          throw new Error(errJson?.error ?? `Falha no upload de "${file.name}"`);
        }
        okCount++;
      }
      toast.success(
        okCount === 1 ? "Anexo adicionado" : `${okCount} anexos adicionados`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      if (okCount > 0) router.refresh();
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5 mr-1.5" />
        )}
        {uploading ? "Enviando..." : "Adicionar anexo"}
      </Button>
    </>
  );
}
