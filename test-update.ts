process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { config } from "dotenv";
config();
config({ path: ".env.local", override: true });

import { PrismaClient } from "./lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";

  console.log(`Connecting to database at ${connectionString}...`);

  // Setup pg Pool
  const pool = new pg.Pool({
    connectionString,
    ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1") ? false : { rejectUnauthorized: false }
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter }) as PrismaClient;

  try {
    // Find the user 'Bruno Ribeiro'
    const user = await prisma.user.findFirst({
      where: { name: { contains: "Bruno", mode: "insensitive" } },
    });

    if (!user) {
      console.log("User 'Bruno' not found.");
      return;
    }

    console.log("Found user:", user);

    console.log("Attempting to update status to active and role to admin...");
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        status: "active",
        role: "admin",
      },
    });

    console.log("Success! Updated user:", updated);
  } catch (error) {
    console.error("Failed to update user:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(console.error);
