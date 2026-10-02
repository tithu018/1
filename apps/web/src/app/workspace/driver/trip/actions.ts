"use server";

import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";

export async function recordDelivery(orderId: string, proofNote?: string) {
  const session = await requireRole("driver");
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, outlet: { depotId: session.depotId } } });
    if (!order) throw new Error("This order is not assigned to your depot.");
    if (["DELIVERED", "CANCELLED"].includes(order.status)) return;
    if (!["LOADED", "OUT_FOR_DELIVERY"].includes(order.status)) throw new Error("The order is not ready for a delivery outcome.");
    await tx.order.update({ where: { id: orderId }, data: { status: "DELIVERED" } });
    await tx.orderStatusEvent.create({ data: { orderId, status: "DELIVERED", reason: proofNote || null } });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Order", entityId: orderId, action: "delivery_recorded", payload: { proofNote: proofNote || null, recordedAt: new Date().toISOString() } } });
  });
}

export async function reportDeliveryException(orderId: string, reason: string) {
  const session = await requireRole("driver");
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, outlet: { depotId: session.depotId } } });
    if (!order) throw new Error("This order is not assigned to your depot.");
    if (["DELIVERED", "CANCELLED"].includes(order.status)) throw new Error("A completed order cannot receive a new delivery exception.");
    if (!reason.trim()) throw new Error("Choose a reason before recording the problem.");
    await tx.orderStatusEvent.create({ data: { orderId, status: "OUT_FOR_DELIVERY", reason } });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Order", entityId: orderId, action: "delivery_exception", payload: { reason } } });
  });
}
