"use server";

import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";

export async function confirmTripLoaded(tripId: string, orderIds: string[]) {
  const session = await requireRole("loader");
  if (!session.depotId || !orderIds.length) throw new Error("A loading confirmation needs at least one order.");
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findFirst({ where: { id: tripId, plan: { depotId: session.depotId, status: "PUBLISHED" } }, include: { allocations: true } });
    if (!trip) throw new Error("This trip is no longer available for loading.");
    const allocated = new Set(trip.allocations.map((allocation) => allocation.orderId));
    if (orderIds.some((orderId) => !allocated.has(orderId))) throw new Error("The checklist does not match the published trip.");
    await tx.trip.update({ where: { id: trip.id }, data: { status: "LOADED" } });
    for (const orderId of orderIds) {
      await tx.order.update({ where: { id: orderId }, data: { status: "LOADED" } });
      await tx.orderStatusEvent.create({ data: { orderId, status: "LOADED", reason: `Confirmed by loader on ${trip.vehicleId}` } });
    }
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Trip", entityId: trip.id, action: "load_confirmed", payload: { orderIds, vehicleId: trip.vehicleId } } });
    return trip.id;
  });
}

export async function confirmLoadedTrip(tripId: string, orderIds: string[], shortfallNote?: string) {
  return confirmTripLoaded(tripId, orderIds).then(() => shortfallNote ?? null);
}
