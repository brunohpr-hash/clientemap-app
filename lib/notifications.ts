import { prisma } from "./prisma";

type NotificationType =
  | "particularidade_critica"
  | "particularidade_editada"
  | "vigencia_expirando"
  | "carteira_transferida";

interface NotifyParams {
  userIds: string[];
  type: NotificationType;
  title: string;
  message?: string;
  referenceId?: string;
  referenceType?: string;
}

export async function notify(params: NotifyParams): Promise<void> {
  if (params.userIds.length === 0) return;

  await prisma.notification.createMany({
    data: params.userIds.map((userId) => ({
      userId,
      type: params.type,
      title: params.title,
      message: params.message,
      referenceId: params.referenceId,
      referenceType: params.referenceType,
    })),
  });
}

// Called when a particularidade is created/updated — notifies all
// collaborators responsible for that client+sector
export async function notifyParticularidadeChange(
  particularidadeId: string,
  clientId: string,
  sectorId: string,
  actorUserId: string,
  type: "critica" | "editada"
): Promise<void> {
  const responsibles = await prisma.clientResponsible.findMany({
    where: { clientId, sectorId },
    select: { userId: true },
  });

  const userIds = responsibles
    .map((r: { userId: string }) => r.userId)
    .filter((id: string) => id !== actorUserId);

  if (userIds.length === 0) return;

  const title =
    type === "critica"
      ? "Nova particularidade crítica adicionada"
      : "Particularidade editada por outro colaborador";

  await notify({
    userIds,
    type: type === "critica" ? "particularidade_critica" : "particularidade_editada",
    title,
    referenceId: particularidadeId,
    referenceType: "particularidade",
  });
}
