"use server";

import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";

export async function publishAssistedPlan(trips: { vehicleId: string; orderIds: string[]; brand: "FRESH" | "STYLE" | "TECH"; district: string }[]) {
  const session = await requireRole("dispatcher");
  if (!session.depotId) throw new Error("Dispatcher account is not linked to a depot.");
  const serviceDate = new Date(); serviceDate.setHours(0, 0, 0, 0);
  return prisma.$transaction(async (tx) => {
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
