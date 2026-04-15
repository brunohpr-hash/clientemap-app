import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LABELS = {
  informativa: "Informativa",
  atencao: "Atenção",
  critica: "Crítica",
} as const;

type Criticality = keyof typeof LABELS;

export function CriticalityBadge({
  level,
  className,
}: {
  level: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        `criticality-${level}`,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", `criticality-dot-${level}`)} />
      {LABELS[level as Criticality] ?? level}
    </span>
  );
}
