import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/shared/app-header";
import { ParticularidadeForm } from "@/components/particularidades/particularidade-form";

export default async function NewParticularidadePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; sectorId?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) redirect("/login");

  try {
    verifyAccessToken(token);
  } catch {
    redirect("/login");
  }

  const { clientId, sectorId } = await searchParams;

  // Load sectors and categories for the form
  const sectors = await prisma.sector.findMany({ orderBy: { order: "asc" } });
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  const clients = await prisma.client.findMany({
    where: { status: "active" },
    select: { id: true, razaoSocial: true, nomeFantasia: true, cnpjCpf: true },
    orderBy: { razaoSocial: "asc" },
    take: 500,
  });

  return (
    <>
      <AppHeader title="Nova Particularidade" />
      <div className="max-w-3xl mx-auto px-6 py-6">
        <ParticularidadeForm
          sectors={sectors}
          categories={categories}
          clients={clients}
          defaultClientId={clientId}
          defaultSectorId={sectorId}
        />
      </div>
    </>
  );
}
