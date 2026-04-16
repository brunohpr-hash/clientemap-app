import { prisma } from "@/lib/prisma";
import { withAuth, ok, err } from "@/lib/api";
import { uploadAttachment, deleteAttachment } from "@/lib/supabase";
import { randomUUID } from "crypto";
import path from "path";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

// POST /api/particularidades/:id/attachments — upload file
export const POST = withAuth(async (request, context, { user }) => {
  const { id } = await context.params;

  const item = await prisma.particularidade.findUnique({
    where: { id },
    select: { id: true, clientId: true, sectorId: true },
  });
  if (!item) return err("Particularidade não encontrada", 404);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return err("Invalid form data", 400);
  }

  const file = formData.get("file") as File | null;
  if (!file) return err("Nenhum arquivo enviado", 400);
  if (file.size > MAX_FILE_SIZE) return err("Arquivo muito grande (máx. 20 MB)", 413);

  const ext = path.extname(file.name) || "";
  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const fileUrl = await uploadAttachment(id, filename, buffer, file.type);

  const attachment = await prisma.particularidadeAttachment.create({
    data: {
      particularidadeId: id,
      originalName: file.name,
      filename,
      fileUrl,
      fileSize: file.size,
      mimeType: file.type,
      uploadedBy: user.sub,
    },
    select: {
      id: true, originalName: true, fileUrl: true, fileSize: true, mimeType: true, createdAt: true,
    },
  });

  return ok(attachment);
});

// DELETE /api/particularidades/:id/attachments?attachmentId=xxx
export const DELETE = withAuth(async (request, context, { user }) => {
  const { id } = await context.params;
  const url = new URL(request.url);
  const attachmentId = url.searchParams.get("attachmentId");
  if (!attachmentId) return err("attachmentId is required", 400);

  const attachment = await prisma.particularidadeAttachment.findFirst({
    where: { id: attachmentId, particularidadeId: id },
    select: { id: true, fileUrl: true, uploadedBy: true, particularidade: { select: { clientId: true, sectorId: true } } },
  });
  if (!attachment) return err("Anexo não encontrado", 404);

  // Only uploader or admin can delete
  if (user.role !== "admin" && attachment.uploadedBy !== user.sub) {
    return err("Sem permissão para remover este anexo", 403);
  }

  await deleteAttachment(attachment.fileUrl);
  await prisma.particularidadeAttachment.delete({ where: { id: attachmentId } });

  return ok({ deleted: true });
});
