import { config } from "dotenv";
config();
config({ path: ".env.local", override: true });

import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter }) as PrismaClient;

const DEFAULT_SECTORS = [
  { name: "Legalização", slug: "legalizacao", color: "#8B5CF6", order: 1 },
  { name: "Departamento Pessoal", slug: "dp", color: "#F59E0B", order: 2 },
  { name: "Fiscal", slug: "fiscal", color: "#EF4444", order: 3 },
  { name: "Contábil", slug: "contabil", color: "#3B82F6", order: 4 },
];

const DEFAULT_CATEGORIES: Record<string, string[]> = {
  legalizacao: [
    "Tipo societário e peculiaridades do contrato social",
    "Licenças e alvarás especiais",
    "Procurações e certificados digitais",
    "Pendências junto a órgãos (Junta, Receita, Prefeitura, SEFAZ)",
    "CNAEs específicos e restrições",
  ],
  dp: [
    "Convenções coletivas e sindicatos aplicáveis",
    "Benefícios concedidos (VT, VR, plano de saúde)",
    "Regras de jornada e banco de horas",
    "Particularidades de folha (rubricas, pensões)",
    "eSocial — eventos específicos e exceções",
    "Estabilidades provisórias ativas",
    "Processos trabalhistas em andamento",
  ],
  fiscal: [
    "Regras específicas de tributação por produto/serviço",
    "Incentivos fiscais ou regimes especiais (ICMS ST, IPI, ISS fixo)",
    "Obrigações acessórias adicionais",
    "Particularidades de NF-e/NFS-e (CSRT, série, CSC)",
    "Certidões e parcelamentos ativos",
    "Retenções na fonte aplicáveis",
  ],
  contabil: [
    "Plano de contas personalizado / particularidades",
    "Prazos e rotinas diferenciadas",
    "Conciliações com pontos de atenção recorrentes",
    "Imobilizado com regras específicas",
    "Distribuição de lucros e pró-labore",
    "Demonstrações ou relatórios adicionais exigidos",
  ],
};

async function main() {
  console.log("🌱 Seeding database...");

  // Upsert default sectors
  for (const sector of DEFAULT_SECTORS) {
    const created = await prisma.sector.upsert({
      where: { slug: sector.slug },
      update: { name: sector.name, color: sector.color, order: sector.order },
      create: { ...sector, isDefault: true },
    });

    // Upsert default categories for this sector
    const cats = DEFAULT_CATEGORIES[sector.slug] ?? [];
    for (let i = 0; i < cats.length; i++) {
      const catName = cats[i];
      const existing = await prisma.category.findFirst({
        where: { sectorId: created.id, name: catName },
      });
      if (!existing) {
        await prisma.category.create({
          data: { sectorId: created.id, name: catName, order: i + 1 },
        });
      }
    }

    console.log(`  ✔ Sector: ${sector.name} (${cats.length} categories)`);
  }

  // Default system settings (null must be Prisma.JsonNull for JSON fields)
  const settings: Array<{ key: string; value: number | string | Record<string, never> }> = [
    { key: "alert_days_before_expiry", value: 15 },
    { key: "office_name", value: "Escritório de Contabilidade" },
    { key: "logo_url", value: {} }, // empty object as placeholder (no logo yet)
  ];

  for (const { key, value } of settings) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
  console.log("  ✔ System settings");

  // Admin user (skip if already exists)
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@clientemap.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin@123456";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        name: "Administrador",
        email: adminEmail,
        passwordHash,
        role: "admin",
        status: "active",
      },
    });
    console.log(`  ✔ Admin user created: ${adminEmail} / ${adminPassword}`);
    console.log("  ⚠  Change the admin password after first login!");
  } else {
    console.log(`  ✔ Admin user already exists: ${adminEmail}`);
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
