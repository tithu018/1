"use server";

import { prisma } from "@waypoint/database";
import { evaluateTrip } from "@waypoint/allocation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { localDate, nextServiceDate, parseServiceDate } from "@/lib/operating-date";
import { planningQueueWhere } from "@/lib/dispatcher-data";
import { serializable } from "@/lib/transactions";

type PlannedTrip = { vehicleId: string; driverId: string; orderIds: string[]; brand: "FRESH" | "STYLE" | "TECH"; district: string };
type DeferredOrder = { orderId: string; reason: string; nextDate: string };
const deferralReasons = ["Capacity full", "Temperature vehicle unavailable", "Delivery window conflict", "Access restriction", "Other"];

export async function publishAssistedPlan(trips: PlannedTrip[], deferred: DeferredOrder[] = [], options: { serviceDate?: string; expectedVersion?: number | null } = {}) {
  const session = await requireRole("dispatcher");
  if (!session.depotId) throw new Error("No depot assigned.");
  const serviceDate = options.serviceDate ? parseServiceDate(options.serviceDate) : nextServiceDate();
  if (serviceDate < parseServiceDate(localDate())) throw new Error("Service date cannot be in the past.");
  const version = await prisma.$transaction(async (tx) => {
    const orderIds = trips.flatMap((trip) => trip.orderIds);
    const accountedIds = [...orderIds, ...deferred.map((order) => order.orderId)];
    if (!accountedIds.length || new Set(accountedIds).size !== accountedIds.length || trips.some((trip) => !trip.orderIds.length)) throw new Error("Every order must appear once, in a trip or a deferral.");
    const latest = await tx.plan.findFirst({ where: { depotId: session.depotId!, serviceDate }, orderBy: { version: "desc" }, include: { trips: true } });
    if (options.expectedVersion !== undefined && (latest?.version ?? null) !== options.expectedVersion) throw new Error("Plan changed. Refresh before publishing.");
    if (latest?.trips.some((trip) => ["OUT_FOR_DELIVERY", "DELIVERED"].includes(trip.status))) throw new Error("A trip has departed. This plan cannot be replaced.");
    const [vehicles, drivers, orders, queue] = await Promise.all([
      tx.vehicle.findMany({ where: { id: { in: trips.map((trip) => trip.vehicleId) }, depotId: session.depotId } }),
      tx.account.findMany({ where: { id: { in: trips.map((trip) => trip.driverId) }, role: "DRIVER", isActive: true, depotId: session.depotId } }),
      tx.order.findMany({ where: { id: { in: accountedIds }, outlet: { depotId: session.depotId }, requestedDate: { lte: serviceDate }, status: { in: ["SUBMITTED", "CONFIRMED", "DEFERRED", "ALLOCATED", "LOADED"] } }, include: { outlet: true, allocations: { include: { plan: true } } } }),
      tx.order.findMany({ where: planningQueueWhere(session.depotId!, serviceDate), select: { id: true } })
    ]);
    if (orders.length !== accountedIds.length || queue.some((order) => !accountedIds.includes(order.id))) throw new Error("Queue changed. Allocate or defer every eligible order.");
    if (orders.some((order) => order.allocations.some((allocation) => allocation.plan.status === "PUBLISHED" && allocation.plan.serviceDate.getTime() !== serviceDate.getTime()))) throw new Error("An order belongs to another published run.");
    const byOrder = new Map(orders.map((order) => [order.id, order]));
    const counts = new Map<string, number>();
    const driverCounts = new Map<string, number>();
    for (const trip of trips) {
      const vehicle = vehicles.find((vehicle) => vehicle.id === trip.vehicleId);
      if (!vehicle) throw new Error("Vehicle is outside your depot.");
      if (!drivers.some((driver) => driver.id === trip.driverId)) throw new Error("Choose an active driver from your depot.");
      counts.set(vehicle.id, (counts.get(vehicle.id) ?? 0) + 1);
      driverCounts.set(trip.driverId, (driverCounts.get(trip.driverId) ?? 0) + 1);
      if (counts.get(vehicle.id)! > 2 || driverCounts.get(trip.driverId)! > 2) throw new Error("A vehicle or driver can run at most two trips per day.");
      const selected = trip.orderIds.map((id) => byOrder.get(id)!);
      if (selected.some((order) => order.outlet.brand !== trip.brand || order.outlet.district !== trip.district)) throw new Error("Trip brand or district does not match its orders.");
      const check = evaluateTrip({ id: vehicle.id, depot: vehicle.depotId, type: vehicle.type === "VAN" ? "van" : "truck", temperature: vehicle.temperature === "REEFER" ? "reefer" : "ambient", weightCapacityKg: Number(vehicle.weightCapacityKg), volumeCapacityM3: Number(vehicle.volumeCapacityM3), inWorkshop: vehicle.isInWorkshop }, selected.map((order) => ({ id: order.id, outletId: order.outletId, depot: order.outlet.depotId, brand: order.outlet.brand, district: order.outlet.district, temperature: order.temperatureRequired === "REEFER" ? "chilled" : "ambient", parkingConstraint: order.outlet.parkingConstraint === "van_only" ? "van_only" : order.outlet.parkingConstraint === "mall_dock" ? "mall_dock" : "normal", weightKg: Number(order.weightKg), volumeM3: Number(order.volumeM3) })));
      if (!check.valid) throw new Error(check.failures.map((failure) => failure.message).join(" "));
    }
    for (const order of deferred) {
      if (!deferralReasons.includes(order.reason)) throw new Error("Choose a deferral reason for every deferred order.");
      if (parseServiceDate(order.nextDate) <= serviceDate) throw new Error("Deferred orders need a later service date.");
    }
    if (latest?.status === "PUBLISHED") {
      await tx.loadSession.updateMany({ where: { trip: { planId: latest.id }, status: "CONFIRMED" }, data: { status: "REVERIFY_REQUIRED" } });
      await tx.plan.update({ where: { id: latest.id }, data: { status: "SUPERSEDED" } });
    }
    const plan = await tx.plan.create({ data: { depotId: session.depotId!, serviceDate, version: (latest?.version ?? 0) + 1, status: "PUBLISHED", publishedAt: new Date() } });
    for (const [index, trip] of trips.entries()) {
      const created = await tx.trip.create({ data: { planId: plan.id, vehicleId: trip.vehicleId, driverId: trip.driverId, tripNumber: index + 1, brand: trip.brand, district: trip.district, status: "ALLOCATED" } });
      for (const [sequence, orderId] of trip.orderIds.entries()) {
        await tx.allocation.create({ data: { planId: plan.id, tripId: created.id, orderId, sequence: sequence + 1 } });
        await tx.order.update({ where: { id: orderId }, data: { status: "ALLOCATED" } });
        await tx.orderStatusEvent.create({ data: { orderId, status: "ALLOCATED", reason: `Plan v${plan.version}` } });
      }
    }
    for (const order of deferred) {
      await tx.order.update({ where: { id: order.orderId }, data: { status: "DEFERRED", requestedDate: parseServiceDate(order.nextDate) } });
      await tx.orderStatusEvent.create({ data: { orderId: order.orderId, status: "DEFERRED", reason: `${order.reason} · moved to ${order.nextDate}` } });
      await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Order", entityId: order.orderId, action: "deferred", payload: { planId: plan.id, reason: order.reason, nextDate: order.nextDate } } });
    }
    const affectedDrivers = [...trips.map((trip) => trip.driverId), ...(latest?.trips.flatMap((trip) => trip.driverId ? [trip.driverId] : []) ?? [])];
    const recipients = await tx.account.findMany({ where: { isActive: true, OR: [{ depotId: session.depotId, role: { in: ["DISPATCHER", "LOADER"] } }, { id: { in: affectedDrivers } }, { outletId: { in: orders.map((order) => order.outletId) } }] }, select: { id: true } });
    await tx.notification.createMany({ data: recipients.filter((recipient) => recipient.id !== session.accountId).map((recipient) => ({ recipientId: recipient.id, type: "PLAN", title: `Plan v${plan.version} published`, body: options.serviceDate ?? serviceDate.toISOString().slice(0, 10), entityType: "Plan", entityId: plan.id })) });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Plan", entityId: plan.id, action: "published", payload: { version: plan.version, deferred: deferred.length } } });
    return plan.version;
  }, { isolationLevel: "Serializable", timeout: 15000 });
  revalidatePath("/workspace", "layout");
  return version;
}

export async function assignTripDriver(tripId: string, driverId: string) {
  const session = await requireRole("dispatcher");
  if (!session.depotId) throw new Error("No depot assigned.");
  await serializable(async (tx) => {
    const trip = await tx.trip.findFirst({ where: { id: tripId, plan: { depotId: session.depotId, status: "PUBLISHED" } }, include: { plan: true } });
    if (!trip || !["ALLOCATED", "LOADED"].includes(trip.status)) throw new Error("Only a trip awaiting departure can be assigned.");
    const driver = await tx.account.findFirst({ where: { id: driverId, role: "DRIVER", isActive: true, depotId: session.depotId } });
    if (!driver) throw new Error("Choose an active driver from your depot.");
    if (trip.driverId === driverId) return;
    if (await tx.trip.count({ where: { id: { not: trip.id }, driverId, plan: { status: "PUBLISHED", serviceDate: trip.plan.serviceDate } } }) >= 2) throw new Error("Driver already has two trips on this date.");
    await tx.trip.update({ where: { id: trip.id }, data: { driverId } });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Trip", entityId: trip.id, action: "driver_assigned", payload: { driverId, previousDriverId: trip.driverId } } });
    await tx.notification.create({ data: { recipientId: driverId, type: "PLAN", title: "Trip assigned", body: `${trip.vehicleId} · ${trip.district}`, entityType: "Trip", entityId: trip.id } });
    if (trip.driverId) await tx.notification.create({ data: { recipientId: trip.driverId, type: "PLAN", title: "Trip reassigned", body: `${trip.vehicleId} · ${trip.district} is now assigned to another driver.`, entityType: "Trip", entityId: trip.id } });
  });
  revalidatePath("/workspace", "layout");
}
