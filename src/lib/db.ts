// src/lib/db.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

if (globalForPrisma.prisma && !('deletionFeedback' in globalForPrisma.prisma)) {
  delete (globalForPrisma as any).prisma;
}

export const prisma = (() => {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }
  
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
})();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}


export default prisma;

