import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdmin, ok, validationError, err } from "@/lib/api";
import { notify } from "@/lib/notifications";

const transferSchema = z.object({
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  sectorId: z.string().uuid().optional(), // if omitted, transfer all sectors
});

// POST /api/transfer — transfer client portfolio between collaborators
export const POST = withAdmin(async (request) => {
  let body: unknown;
  try { body = await request.json(); } catch { return err("Invalid JSON", 400); }

  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { fromUserId, toUserId, sectorId } = parsed.data;

  if (fromUserId === toUserId) return err("Origem e destino devem ser diferentes", 400);

  const [fromUser, toUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: fromUserId }, select: { id: true, name: true } }),
    prisma.user.findUnique({ where: { id: toUserId }, select: { id: true, name: true } }),
  ]);

  if (!fromUser) return err("Colaborador de origem não encontrado", 404);
  if (!toUser) return err("Colaborador de destino não encontrado", 404);

  // Find all client responsibles to transfer
  const responsibles = await prisma.clientResponsible.findMany({
    where: {
      userId: fromUserId,
      ...(sectorId ? { sectorId } : {}),
    },
    include: {
      client: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
      sector: { select: { id: true, name: true } },
    },
  });

  if (responsibles.length === 0) {
    return err("Nenhum cliente encontrado na carteira do colaborador", 404);
  }

  // Transfer: update userId for each responsible record
  // If toUser is already responsible for the same client+sector, update; else reassign
  let transferred = 0;
  for (const resp of responsibles) {
    const existingForTarget = await prisma.clientResponsible.findFirst({
      where: { clientId: resp.clientId, sectorId: resp.sectorId, userId: toUserId },
    });

    if (existingForTarget) {
      // Target is already responsible — just remove from source
      await prisma.clientResponsible.delete({ where: { id: resp.id } });
    } else {
      // Transfer ownership
      await prisma.clientResponsible.update({
        where: { id: resp.id },
        data: { userId: toUserId },
      });
    }
    transferred++;
  }

  // Also transfer user_sectors mapping if sectorId provided
  if (sectorId) {
    const hasSector = await prisma.userSector.findUnique({
      where: { userId_sectorId: { userId: toUserId, sectorId } },
    });
    if (!hasSector) {
      await prisma.userSector.create({ data: { userId: toUserId, sectorId } });
    }
  }

  // Build transition summary
  const clientIds = [...new Set(responsibles.map((r) => r.clientId))];
  const vigentCount = await prisma.particularidade.count({
    where: {
      clientId: { in: clientIds },
      ...(sectorId ? { sectorId } : {}),
      isActive: true,
      vigenciaFim: null,
    },
  });
  const criticalCount = await prisma.particularidade.count({
    where: {
      clientId: { in: clientIds },
      ...(sectorId ? { sectorId } : {}),
      isActive: true,
      vigenciaFim: null,
      criticality: "critica",
    },
  });

  // Notify receiving user
  await notify({
    userIds: [toUserId],
    type: "carteira_transferida",
    title: `Carteira transferida: ${transferred} cliente(s) de ${fromUser.name}`,
    message: `Você recebeu ${transferred} cliente(s). ${vigentCount} particularidade(s) vigente(s), ${criticalCount} crítica(s).`,
    referenceId: fromUserId,
    referenceType: "user",
  });

  return ok({
    transferred,
    fromUser: fromUser.name,
    toUser: toUser.name,
    clientsAffected: clientIds.length,
    summary: {
      vigentParticularidades: vigentCount,
      criticalParticularidades: criticalCount,
    },
  });
});
