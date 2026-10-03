import { config } from "dotenv";
import { hash } from "bcryptjs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(import.meta.dirname, "../../../.env"), override: true });
const email = process.env.DISPATCHER_EMAIL?.trim().toLowerCase();
const password = process.env.DISPATCHER_PASSWORD;
const depotId = process.env.DISPATCHER_DEPOT ?? "Peliyagoda";
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12 || Buffer.byteLength(password) > 72 || !["Peliyagoda", "Kandy"].includes(depotId)) throw new Error("Set DISPATCHER_EMAIL, a 12+ character DISPATCHER_PASSWORD (maximum 72 bytes), and DISPATCHER_DEPOT (Peliyagoda or Kandy).");
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL?.replace("@localhost:5432", "@127.0.0.1:5433") } } });
try {
  const passwordHash = await hash(password, 12);
  await prisma.$transaction(async (tx) => {
    for (const id of ["Peliyagoda", "Kandy"]) await tx.depot.upsert({ where: { id }, update: {}, create: { id, name: id } });
    const existing = await tx.account.findUnique({ where: { email } });
    if (existing) throw new Error("This email already exists. Bootstrap never replaces an existing account.");
    await tx.account.create({ data: { email, passwordHash, displayName: process.env.DISPATCHER_NAME?.trim() || "Dispatcher", role: "DISPATCHER", depotId } });
  });
  console.log("Dispatcher account created. No sample operational data was inserted.");
} finally { await prisma.$disconnect(); }
