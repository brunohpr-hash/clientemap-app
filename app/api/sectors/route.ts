import { prisma } from "@/lib/prisma";
import { withAuth, ok } from "@/lib/api";

// GET /api/sectors — all sectors (used for forms, tabs, etc.)
export const GET = withAuth(async () => {
  const sectors = await prisma.sector.findMany({
    orderBy: { order: "asc" },
    include: {
      categories: {
        where: { isActive: true },
        orderBy: { order: "asc" },
        select: { id: true, name: true, order: true },
      },
    },
  });
  return ok(sectors);
});
