import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// ─── Prisma client singleton ───────────────────────────────────────────────────
//
// Prisma 7 requires an explicit driver adapter — it no longer reads
// DATABASE_URL automatically. We use the official @prisma/adapter-pg adapter
// backed by a `pg` connection pool.
//
// The singleton is stored on `globalThis` (which survives Next.js HMR) so
// only one PrismaClient + Pool exists per process in development.
//
// Docs: https://pris.ly/d/driver-adapters

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  } as ConstructorParameters<typeof PrismaClient>[0]);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
