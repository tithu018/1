import { prisma, type Prisma } from "@waypoint/database";

export async function serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: "Serializable", timeout: 15000 }); }
    catch (error) {
      if (attempt >= 2 || typeof error !== "object" || !error || !("code" in error) || !["P2034", "P2002"].includes(String(error.code))) throw error;
    }
  }
}
