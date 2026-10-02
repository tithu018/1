"use server";

import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";

export async function recordReceipt(orderId: string, receivedUnits: number, expectedUnits: number, outcome: "full" | "short" | "reservation", note: string) {
  const session = await requireRole("store_manager");
  if (!session.outletId || receivedUnits < 0 || receivedUnits > expectedUnits) throw new Error("Receipt quantities are invalid.");
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, outletId: session.outletId }, include: { outlet: true } });
    if (!order) throw new Error("This order is not available to the signed-in outlet.");
    if (expectedUnits !== order.units || !Number.isSafeInteger(receivedUnits)) throw new Error("Receipt quantities must match the order.");
    if (outcome === "reservation" && order.outlet.brand !== "TECH") throw new Error("Reservation is available for Tech deliveries only.");
    if (!["DELIVERED", "OUT_FOR_DELIVERY"].includes(order.status)) throw new Error("Only an out-for-delivery order can be receipted.");
    await tx.receiptRecord.upsert({ where: { orderId }, update: { confirmedById: session.accountId, expectedUnits, receivedUnits, outcome, note: note.trim() || null, confirmedAt: new Date() }, create: { orderId, confirmedById: session.accountId, expectedUnits, receivedUnits, outcome, note: note.trim() || null } });
    const existing = await tx.issueCase.findFirst({ where: { orderId, summary: { startsWith: "Receipt:" } } });
    const issue = receivedUnits < expectedUnits || outcome !== "full"
      ? existing ?? await tx.issueCase.create({ data: { orderId, openedById: session.accountId, summary: `Receipt: ${receivedUnits}/${expectedUnits} units received${note.trim() ? ` - ${note.trim()}` : ""}`, events: { create: { to: "REPORTED", note: note.trim() || null, actorId: session.accountId } } } })
      : null;
    const recipients = await tx.account.findMany({ where: { OR: [{ outletId: order.outletId }, { depotId: order.outlet.depotId }] }, select: { id: true } });
    await tx.notification.createMany({ data: recipients.filter((recipient) => recipient.id !== session.accountId).map((recipient) => ({ recipientId: recipient.id, type: issue ? "ISSUE" : "ORDER", title: issue ? `Receipt issue for ${order.id}` : `Receipt confirmed for ${order.id}`, body: issue ? `Received ${receivedUnits} of ${expectedUnits} units.` : "The Store confirmed the delivery in full.", entityType: issue ? "IssueCase" : "Order", entityId: issue?.id ?? order.id })) });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Order", entityId: orderId, action: "receipt_recorded", payload: { receivedUnits, expectedUnits, outcome, issueId: issue?.id ?? null, note: note.trim() || null } } });
    return { issueId: issue?.id ?? null };
  });
}
