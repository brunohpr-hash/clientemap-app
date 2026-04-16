import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, noContent, validationError, err } from "@/lib/api";

const updateClientSchema = z.object({
  razaoSocial: z.string().min(2).max(300).optional(),
  nomeFantasia: z.string().max(300).optional(),
  cnpjCpf: z.string().min(11).max(18).optional(),
  inscricaoEstadual: z.string().max(50).optional(),
  inscricaoMunicipal: z.string().max(50).optional(),
  regimeTributario: z.enum(["mei", "simples_nacional", "lucro_presumido", "lucro_real"]).optional(),
  dataInicioContabilidade: z.string().optional(),
  status: z.enum(["active", "inactive", "closing"]).optional(),
  observacoes: z.string().optional(),
  responsibles: z.record(z.string().uuid(), z.string().uuid()).optional(),
});

// GET /api/clients/:id — full client with responsibles + particularidade counts by sector
export const GET = withAuth(async (_request, context, { user }) => {
  const { id } = await context.params;

  const client = await prisma.client.findFirst({
    where: { id },
    include: {
      responsibles: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          sector: { select: { id: true, name: true, slug: true, color: true } },
        },
      },
    },
  });

  if (!client) return err("Cliente não encontrado", 404);
  return ok(client);
});

// PATCH /api/clients/:id
export const PATCH = withAuth(async (request, context, { user }) => {
  if (user.role !== "admin") return err("Apenas administradores podem editar clientes", 403);

  const { id } = await context.params;

  let body: unknown;
  try { body = await request.json(); } catch { return err("Invalid JSON", 400); }

  const parsed = updateClientSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { responsibles: respMap, dataInicioContabilidade, cnpjCpf, ...rest } = parsed.data;

  if (cnpjCpf) {
    const existing = await prisma.client.findFirst({
      where: { cnpjCpf, NOT: { id } },
    });
    if (existing) return err("CNPJ/CPF já em uso", 409);
  }

  const updateData: Record<string, unknown> = { ...rest };
  if (cnpjCpf) updateData.cnpjCpf = cnpjCpf;
  if (dataInicioContabilidade) updateData.dataInicioContabilidade = new Date(dataInicioContabilidade);

  // Replace responsibles if provided
  if (respMap) {
    await prisma.clientResponsible.deleteMany({ where: { clientId: id } });
    updateData.responsibles = {
      create: Object.entries(respMap).map(([sectorId, userId]) => ({
        sectorId, userId, isPrimary: true,
      })),
    };
  }

  const client = await prisma.client.update({
    where: { id },
    data: updateData,
    select: {
      id: true, razaoSocial: true, nomeFantasia: true, cnpjCpf: true,
      regimeTributario: true, status: true, updatedAt: true,
    },
  });

  return ok(client);
});

// DELETE /api/clients/:id — hard delete with cascade removal
export const DELETE = withAuth(async (_request, context, { user }) => {
  if (user.role !== "admin") return err("Apenas administradores podem remover clientes", 403);

  const { id } = await context.params;

  // Gather all particularidades to wipe their attachments from remote storage
  const clientParticularidades = await prisma.particularidade.findMany({
    where: { clientId: id },
    include: { attachments: true },
  });

  const { deleteAttachment } = await import("@/lib/supabase");

  for (const part of clientParticularidades) {
    for (const attachment of part.attachments) {
      if (attachment.fileUrl) {
        await deleteAttachment(attachment.fileUrl).catch(console.error);
      }
    }
  }

  // ParticularidadeHistory has no cascade by default, so we clear it out manually
  const particIds = clientParticularidades.map((p) => p.id);
  if (particIds.length > 0) {
    await prisma.particularidadeHistory.deleteMany({
      where: { particularidadeId: { in: particIds } },
    });
    
    // Just to be extra safe before deleting particularidade
    await prisma.particularidadeAttachment.deleteMany({
       where: { particularidadeId: { in: particIds } },
    });
  }

  // Final cascading database delete
  await prisma.client.delete({ where: { id } });

  return noContent();
});

