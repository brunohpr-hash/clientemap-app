const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const categories = await prisma.category.findMany({
    where: { name: { contains: "teste", mode: "insensitive" } },
    include: { _count: { select: { particularidades: true } } }
  });

  console.log("Categories found:", JSON.stringify(categories, null, 2));

  for (const cat of categories) {
    if (cat._count.particularidades > 0) {
      console.log(`Category ${cat.name} (${cat.id}) has ${cat._count.particularidades} particularidades. Cannot delete normally.`);
      continue;
    }
    
    console.log(`Attempting to delete ${cat.name} (${cat.id})`);
    try {
      await prisma.category.delete({ where: { id: cat.id } });
      console.log(`Successfully deleted ${cat.id}!`);
    } catch (e) {
      console.error(`Error deleting ${cat.id}:`, e);
    }
  }

  console.log("Checking all categories in Legalização just in case:");
  const leg = await prisma.category.findMany({
    where: { sector: { name: { contains: "Legal", mode: "insensitive" } } },
    include: { _count: { select: { particularidades: true } } }
  });
  console.log(JSON.stringify(leg, null, 2));
}

test().catch(console.error).finally(() => prisma.$disconnect());
