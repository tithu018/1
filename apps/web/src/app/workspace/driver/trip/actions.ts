"use server";

import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";

export async function recordDelivery(orderId: string, proofNote?: string) {
  const session = await requireRole("driver");
  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "DELIVERED" } });
    await tx.orderStatusEvent.create({ data: { orderId, status: "DELIVERED", reason: proofNote || null } });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Order", entityId: orderId, action: "delivery_recorded", payload: { proofNote: proofNote || null, recordedAt: new Date().toISOString() } } });
  });
}

export async function reportDeliveryException(orderId: string, reason: string) {
  const session = await requireRole("driver");
  await prisma.$transaction(async (tx) => {
    await tx.orderStatusEvent.create({ data: { orderId, status: "OUT_FOR_DELIVERY", reason } });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Order", entityId: orderId, action: "delivery_exception", payload: { reason } } });
  });
}
