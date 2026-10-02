"use server";

import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";

export async function publishAssistedPlan(trips: { vehicleId: string; orderIds: string[]; brand: "FRESH" | "STYLE" | "TECH"; district: string }[]) {
  const session = await requireRole("dispatcher");
  if (!session.depotId) throw new Error("Dispatcher account is not linked to a depot.");
  const serviceDate = new Date(); serviceDate.setHours(0, 0, 0, 0);
  return prisma.$transaction(async (tx) => {
    const vehicleIds = [...new Set(trips.map((trip) => trip.vehicleId))];
    const orderIds = trips.flatMap((trip) => trip.orderIds);
    if (!trips.length || new Set(orderIds).size !== orderIds.length) throw new Error("Every published trip must contain unique orders.");
    const [vehicles, orders] = await Promise.all([
      tx.vehicle.findMany({ where: { id: { in: vehicleIds }, depotId: session.depotId } }),
      tx.order.findMany({ where: { id: { in: orderIds }, outlet: { depotId: session.depotId }, status: { in: ["SUBMITTED", "CONFIRMED", "DEFERRED"] } }, include: { outlet: true } })
    ]);
    if (vehicles.length !== vehicleIds.length || orders.length !== orderIds.length) throw new Error("The plan contains a vehicle or order that is no longer available in this depot.");
    if (vehicles.some((vehicle) => vehicle.isInWorkshop)) throw new Error("A vehicle in the plan is currently in the workshop.");
    const orderById = new Map(orders.map((order) => [order.id, order]));
    for (const trip of trips) {
      for (const orderId of trip.orderIds) {
        const order = orderById.get(orderId);
        if (!order || order.outlet.brand !== trip.brand || order.outlet.district !== trip.district) throw new Error("Trip grouping no longer matches the order's outlet rules.");
      }
    }
    const latest = await tx.plan.findFirst({ where: { depotId: session.depotId!, serviceDate }, orderBy: { version: "desc" } });
    if (latest?.status === "PUBLISHED") await tx.plan.update({ where: { id: latest.id }, data: { status: "SUPERSEDED" } });
    const plan = await tx.plan.create({ data: { depotId: session.depotId!, serviceDate, version: (latest?.version ?? 0) + 1, status: "PUBLISHED", publishedAt: new Date() } });
    for (const [index, trip] of trips.entries()) {
      const createdTrip = await tx.trip.create({ data: { planId: plan.id, vehicleId: trip.vehicleId, tripNumber: index + 1, brand: trip.brand, district: trip.district, status: "ALLOCATED" } });
      for (const [sequence, orderId] of trip.orderIds.entries()) {
        await tx.allocation.create({ data: { planId: plan.id, tripId: createdTrip.id, orderId, sequence: sequence + 1 } });
        await tx.order.update({ where: { id: orderId }, data: { status: "ALLOCATED" } });
        await tx.orderStatusEvent.create({ data: { orderId, status: "ALLOCATED" } });
      }
    }
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Plan", entityId: plan.id, action: "published", payload: { version: plan.version } } });
    return plan.version;
  });
}
