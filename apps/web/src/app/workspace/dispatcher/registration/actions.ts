"use server";

import { hash } from "bcryptjs";
import { prisma } from "@waypoint/database";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { parseRegistration } from "@/lib/registration";

export async function registerStoreManager(_previous: { error?: string; success?: string }, form: FormData): Promise<{ error?: string; success?: string }> {
  const session = await requireRole("dispatcher");
  if (!session.depotId) return { error: "Your dispatcher account must be linked to a depot." };
  try {
    const { password, displayName, email, ...outletData } = parseRegistration(form);
    const passwordHash = await hash(password, 12);
    await prisma.$transaction(async (tx) => {
      if (!await tx.depot.findUnique({ where: { id: session.depotId } })) throw new Error("Your depot could not be found.");
      if (await tx.account.findUnique({ where: { email } })) throw new Error("An account already uses this email address.");
      const existing = await tx.outlet.findUnique({ where: { id: outletData.outletId }, include: { accounts: { where: { role: "STORE_MANAGER" } } } });
      if (existing && (existing.depotId !== session.depotId || existing.brand !== outletData.brand || existing.accounts.length)) throw new Error("This outlet is already managed or belongs to a different depot or brand.");
      const { outletId, ...details } = outletData;
      // Existing outlet constraints are preserved; registration never overwrites master data.
      const outlet = existing ?? await tx.outlet.create({ data: { id: outletId, depotId: session.depotId!, ...details } });
      const account = await tx.account.create({ data: { displayName, email, passwordHash, role: "STORE_MANAGER", outletId: outlet.id, depotId: session.depotId } });
      await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Account", entityId: account.id, action: "store_manager_registered", payload: { outletId: outlet.id, brand: outlet.brand, depotId: session.depotId } } });
      await tx.notification.create({ data: { recipientId: account.id, type: "SYSTEM", title: "Welcome to Waypoint", body: `Your account is linked to ${outlet.id}. You can now place orders and track deliveries.` } });
    }, { isolationLevel: "Serializable" });
    revalidatePath("/workspace", "layout");
    return { success: `${displayName} registered for ${outletData.outletId}. The manager can sign in with the email and password you supplied.` };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2034") return { error: "This outlet was changed by another dispatcher. Refresh and try again." };
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return { error: "That email address or outlet ID was just registered. Refresh and try again." };
    return { error: error instanceof Error ? error.message : "Registration failed. Please try again." };
  }
}
