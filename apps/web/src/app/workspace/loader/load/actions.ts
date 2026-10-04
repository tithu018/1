"use server";

import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function confirmTripLoaded(tripId: string, orderIds: string[]) {
  const session = await requireRole("loader");
  if (!session.depotId || !orderIds.length) throw new Error("A loading confirmation needs at least one order.");
  const result = await prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findFirst({ where: { id: tripId, plan: { depotId: session.depotId, status: "PUBLISHED" } }, include: { allocations: true, vehicle: true } });
    if (!trip) throw new Error("This trip is no longer available for loading.");
    if (!["ALLOCATED", "LOADED"].includes(trip.status) || trip.vehicle.isInWorkshop) throw new Error("Trip is not available for loading.");
    const allocated = new Set(trip.allocations.map((allocation) => allocation.orderId));
    if (orderIds.some((orderId) => !allocated.has(orderId))) throw new Error("The checklist does not match the published trip.");
    if (new Set(orderIds).size !== allocated.size || new Set(orderIds).size !== orderIds.length) throw new Error("Confirm every published stop exactly once.");
    if (trip.status === "LOADED") return trip.id;
    await tx.trip.update({ where: { id: trip.id }, data: { status: "LOADED" } });
    for (const orderId of orderIds) {
      await tx.order.update({ where: { id: orderId }, data: { status: "LOADED" } });
      await tx.orderStatusEvent.create({ data: { orderId, status: "LOADED", reason: `Confirmed by loader on ${trip.vehicleId}` } });
    }
    const orders = await tx.order.findMany({ where: { id: { in: orderIds } }, select: { outletId: true } });
    const recipients = await tx.account.findMany({ where: { isActive: true, OR: [{ depotId: session.depotId, role: { in: ["DISPATCHER", "LOADER"] } }, { id: trip.driverId ?? "" }, { outletId: { in: orders.map((order) => order.outletId) } }] }, select: { id: true } });
    await tx.notification.createMany({ data: recipients.filter((recipient) => recipient.id !== session.accountId).map((recipient) => ({ recipientId: recipient.id, type: "LOAD", title: `${trip.vehicleId} loaded`, body: `${orderIds.length} orders are ready for Driver handoff.`, entityType: "Trip", entityId: trip.id })) });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Trip", entityId: trip.id, action: "load_confirmed", payload: { orderIds, vehicleId: trip.vehicleId } } });
    return trip.id;
  }, { isolationLevel: "Serializable" });
  revalidatePath("/workspace", "layout");
  return result;
}

export async function confirmLoadedTrip(tripId: string, orderIds: string[], shortfallNote?: string) {
  return confirmTripLoaded(tripId, orderIds).then(() => shortfallNote ?? null);
}
