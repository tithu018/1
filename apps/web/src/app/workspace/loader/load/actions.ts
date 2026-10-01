"use server";

import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";

export async function confirmLoadedTrip(tripId: string, orderIds: string[], shortfallNote?: string) {
  const session = await requireRole("loader");
  await prisma.$transaction(async (tx) => {
    await tx.trip.update({ where: { id: tripId }, data: { status: "LOADED" } });
    for (const orderId of orderIds) {
      await tx.order.update({ where: { id: orderId }, data: { status: "LOADED" } });
      await tx.orderStatusEvent.create({ data: { orderId, status: "LOADED", reason: shortfallNote || null } });
    }
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Trip", entityId: tripId, action: "load_confirmed", payload: { shortfallNote: shortfallNote || null } } });
  });
}
