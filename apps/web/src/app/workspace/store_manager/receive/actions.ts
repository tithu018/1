"use server";

import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";

export async function recordReceipt(orderId: string, receivedUnits: number, expectedUnits: number, outcome: "full" | "short" | "reservation", note: string) {
  const session = await requireRole("store_manager");
  if (!session.outletId || receivedUnits < 0 || receivedUnits > expectedUnits) throw new Error("Receipt quantities are invalid.");
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, outletId: session.outletId } });
    if (!order) throw new Error("This order is not available to the signed-in outlet.");
    if (!["DELIVERED", "OUT_FOR_DELIVERY"].includes(order.status)) throw new Error("Only an out-for-delivery order can be receipted.");
    const existing = await tx.issueCase.findFirst({ where: { orderId, summary: { startsWith: "Receipt:" } } });
    const issue = receivedUnits < expectedUnits || outcome !== "full"
      ? existing ?? await tx.issueCase.create({ data: { orderId, summary: `Receipt: ${receivedUnits}/${expectedUnits} units received${note.trim() ? ` - ${note.trim()}` : ""}` } })
      : null;
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Order", entityId: orderId, action: "receipt_recorded", payload: { receivedUnits, expectedUnits, outcome, issueId: issue?.id ?? null, note: note.trim() || null } } });
    return { issueId: issue?.id ?? null };
  });
}