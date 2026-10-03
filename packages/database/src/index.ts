import { PrismaClient } from "@prisma/client";
export { Prisma, PrismaClient } from "@prisma/client";
export type { Account } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL?.replace("@localhost:5432", "@127.0.0.1:5433");

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
