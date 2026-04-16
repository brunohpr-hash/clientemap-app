import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, withAdmin, ok, noContent, validationError, err } from "@/lib/api";
import { notifyParticularidadeChange } from "@/lib/notifications";

const updateSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  title: z.string().min(3).max(150).optional(),
  description: z.string().min(1).optional(),
  criticality: z.enum(["informativa", "atencao", "critica"]).optional(),
  vigenciaInicio: z.string().optional(),
  vigenciaFim: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/particularidades/:id — full detail with history and attachments
export const GET = withAuth(async (_request, context, { user }) => {
  const { id } = await context.params;

  const item = await prisma.particularidade.findFirst({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      sector: { select: { id: true, name: true, slug: true, color: true } },
      client: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
      createdByUser: { select: { id: true, name: true } },
      updatedByUser: { select: { id: true, name: true } },
      attachments: {
        select: {
          id: true, originalName: true, fileUrl: true, fileSize: true, mimeType: true,
          createdAt: true, uploader: { select: { id: true, name: true } },
        },
      },
      history: {
        orderBy: { performedAt: "desc" },
        select: {
          id: true, action: true, changedFields: true, oldValues: true, newValues: true,
          performedAt: true, performer: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!item) return err("Particularidade não encontrada", 404);
  return ok(item);
});

// PATCH /api/particularidades/:id
export const PATCH = withAuth(async (request, context, { user }) => {
  const { id } = await context.params;

  let body: unknown;
  try { body = await request.json(); } catch { return err("Invalid JSON", 400); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const current = await prisma.particularidade.findUnique({ where: { id } });
  if (!current) return err("Particularidade não encontrada", 404);

  const { vigenciaInicio, vigenciaFim, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest, updatedBy: user.sub };
  if (vigenciaInicio) updateData.vigenciaInicio = new Date(vigenciaInicio);
  if (vigenciaFim !== undefined) updateData.vigenciaFim = vigenciaFim ? new Date(vigenciaFim) : null;

  // Compute changed fields for history
  const changedFields: string[] = [];
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  for (const key of Object.keys(updateData)) {
    if (key === "updatedBy") continue;
    const oldVal = (current as Record<string, unknown>)[key];
    const newVal = updateData[key];
    if (String(oldVal) !== String(newVal)) {
      changedFields.push(key);
      oldValues[key] = oldVal;
      newValues[key] = newVal;
    }
  }

  const action =
    updateData.vigenciaFim && !current.vigenciaFim
      ? "closed"
      : updateData.isActive === true && !current.isActive
      ? "reactivated"
      : "updated";

  const updated = await prisma.particularidade.update({
    where: { id },
    data: {
      ...updateData,
      history: {
        create: {
          action,
          changedFields: JSON.parse(JSON.stringify(changedFields)),
          oldValues: JSON.parse(JSON.stringify(oldValues)),
          newValues: JSON.parse(JSON.stringify(newValues)),
          performedBy: user.sub,
        },
      },
    },
    select: { id: true, title: true, criticality: true, vigenciaFim: true, isActive: true, updatedAt: true },
  });

  // Notify if someone else edited
  await notifyParticularidadeChange(
    id, current.clientId, current.sectorId, user.sub, "editada"
  );

  return ok(updated);
});

// DELETE /api/particularidades/:id
export const DELETE = withAdmin(async (_request, context) => {
  const { id } = await context.params;

  const current = await prisma.particularidade.findUnique({
    where: { id },
    include: { attachments: true },
  });

  if (!current) return err("Particularidade não encontrada", 404);

  // Import dynamic due to top level requirements or just normal import
  const { deleteAttachment } = await import("@/lib/supabase");

  // Deletar os arquivos do Supabase fisicamente
  for (const attachment of current.attachments) {
    if (attachment.fileUrl) {
      await deleteAttachment(attachment.fileUrl).catch(console.error);
    }
  }

  // Deletar o histórico (já que no schema não tem onDelete: Cascade)
  await prisma.particularidadeHistory.deleteMany({
    where: { particularidadeId: id },
  });

  // Deletar os anexos do banco
  await prisma.particularidadeAttachment.deleteMany({
    where: { particularidadeId: id },
  });

  // Deleção final
  await prisma.particularidade.delete({ where: { id } });

  return noContent();
});
