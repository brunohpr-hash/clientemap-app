import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/shared/app-header";
import { ParticularidadeEditForm } from "@/components/particularidades/particularidade-edit-form";

export default async function EditParticularidadePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) redirect("/login");

  try {
    verifyAccessToken(token);
  } catch {
    redirect("/login");
  }

  const item = await prisma.particularidade.findFirst({
    where: { id },
    include: {
      sector: { select: { id: true, name: true } },
      client: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
      category: { select: { id: true, name: true } },
    },
  });

  if (!item) notFound();

  const categories = await prisma.category.findMany({
    where: { sectorId: item.sectorId },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <AppHeader title="Editar Particularidade" />
      <div className="max-w-3xl mx-auto px-6 py-6">
        <ParticularidadeEditForm
          item={{
            id: item.id,
            clientId: item.clientId,
            sectorId: item.sectorId,
            categoryId: item.categoryId ?? "",
            title: item.title,
            description: item.description,
            criticality: item.criticality,
            vigenciaInicio: item.vigenciaInicio.toISOString().split("T")[0],
            vigenciaFim: item.vigenciaFim
              ? item.vigenciaFim.toISOString().split("T")[0]
              : "",
            isActive: item.isActive,
            clientName:
              item.client.nomeFantasia ?? item.client.razaoSocial,
            sectorName: item.sector.name,
          }}
          categories={categories}
        />
      </div>
    </>
  );
}
