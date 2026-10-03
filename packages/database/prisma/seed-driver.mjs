import { config } from "dotenv";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(import.meta.dirname, "../../../.env"), override: true });
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL?.replace("@localhost:5432", "@127.0.0.1:5433") } } });
const email = process.env.DRIVER_DEMO_EMAIL?.trim().toLowerCase() ?? "driver@waypoint.demo";
const locations = [
  { id: "DRIVER-DEMO-FORT", address: "Demo stop near Colombo Fort", latitude: 6.9344, longitude: 79.8428, dockType: "rear_dock", units: 12, item: "Chilled cartons", weight: 120, volume: .8 },
  { id: "DRIVER-DEMO-BORELLA", address: "Demo stop near Borella", latitude: 6.9147, longitude: 79.8778, dockType: "street", units: 8, item: "Fresh produce crates", weight: 80, volume: .6 }
];

try {
  const result = await prisma.$transaction(async (tx) => {
    const driver = await tx.account.findUnique({ where: { email } });
    if (!driver || driver.role !== "DRIVER" || !driver.isActive || !driver.depotId) throw new Error("Set DRIVER_DEMO_EMAIL to an existing active driver with an assigned depot. This command never creates driver accounts or changes passwords.");
    const depotId = driver.depotId;
    const preview = await tx.account.findUnique({ where: { email: "driver.preview@waypoint.demo" } });
    if (preview && preview.id !== driver.id) {
      if (preview.depotId !== "DRIVER-DEMO" || preview.role !== "DRIVER" || await tx.trip.count({ where: { driverId: preview.id, plan: { depotId: { not: "DRIVER-DEMO" } } } })) throw new Error("Preview account contains unrelated work. It cannot be consolidated automatically.");
      const demoPlans = await tx.plan.findMany({ where: { depotId: "DRIVER-DEMO" }, orderBy: { version: "asc" } });
      for (const plan of demoPlans) {
        const latest = await tx.plan.findFirst({ where: { depotId, serviceDate: plan.serviceDate }, orderBy: { version: "desc" } });
        await tx.plan.update({ where: { id: plan.id }, data: { depotId, version: (latest?.version ?? 0) + 1 } });
      }
      await tx.outlet.updateMany({ where: { depotId: "DRIVER-DEMO", id: { in: locations.map((location) => location.id) } }, data: { depotId } });
      await tx.vehicle.updateMany({ where: { depotId: "DRIVER-DEMO", id: "DRIVER-DEMO-VAN" }, data: { depotId } });
      await tx.trip.updateMany({ where: { driverId: preview.id }, data: { driverId: driver.id } });
      await tx.deliveryOutcomeRecord.updateMany({ where: { driverId: preview.id }, data: { driverId: driver.id } });
      await tx.syncOperation.updateMany({ where: { accountId: preview.id }, data: { accountId: driver.id } });
      await tx.notification.updateMany({ where: { recipientId: preview.id }, data: { recipientId: driver.id } });
      await tx.auditEvent.updateMany({ where: { actorId: preview.id }, data: { actorId: driver.id } });
      await tx.issueEvent.updateMany({ where: { actorId: preview.id }, data: { actorId: driver.id } });
      await tx.issueCase.updateMany({ where: { openedById: preview.id }, data: { openedById: driver.id } });
      await tx.proofAsset.updateMany({ where: { capturedById: preview.id }, data: { capturedById: driver.id } });
      await tx.loadIssue.updateMany({ where: { createdById: preview.id }, data: { createdById: driver.id } });
      await tx.receiptRecord.updateMany({ where: { confirmedById: preview.id }, data: { confirmedById: driver.id } });
      await tx.account.delete({ where: { id: preview.id } });
      const unused = await tx.depot.findUnique({ where: { id: "DRIVER-DEMO" }, include: { _count: { select: { plans: true, outlets: true, vehicles: true } } } });
      if (unused && !Object.values(unused._count).some(Boolean) && !await tx.account.count({ where: { depotId: "DRIVER-DEMO" } })) await tx.depot.delete({ where: { id: "DRIVER-DEMO" } });
      await tx.auditEvent.create({ data: { actorId: driver.id, entityType: "Account", entityId: driver.id, action: "driver_demo_consolidated", payload: { previousAccountId: preview.id } } });
    }
    const active = await tx.trip.findFirst({ where: { driverId: driver.id, vehicleId: "DRIVER-DEMO-VAN", plan: { depotId, status: "PUBLISHED" }, status: { in: ["LOADED", "OUT_FOR_DELIVERY"] } } });
    if (active) return { tripId: active.id, created: false };
    for (const location of locations) {
      const existing = await tx.outlet.findUnique({ where: { id: location.id } });
      if (existing && existing.depotId !== depotId) throw new Error("Demo outlet belongs to another depot.");
      await tx.outlet.upsert({ where: { id: location.id }, update: {}, create: { id: location.id, depotId, brand: "FRESH", district: "Colombo", address: location.address, latitude: location.latitude, longitude: location.longitude, dockType: location.dockType, parkingConstraint: "van_only", windowOpenTime: "05:00", windowCloseTime: "08:00" } });
    }
    const vehicle = await tx.vehicle.findUnique({ where: { id: "DRIVER-DEMO-VAN" } });
    if (vehicle && vehicle.depotId !== depotId) throw new Error("Demo vehicle belongs to another depot.");
    await tx.vehicle.upsert({ where: { id: "DRIVER-DEMO-VAN" }, update: {}, create: { id: "DRIVER-DEMO-VAN", depotId, type: "VAN", temperature: "REEFER", weightCapacityKg: 1000, volumeCapacityM3: 7, kilometersPerLitre: 8, weeklyFuelQuotaL: 150 } });
    const serviceDate = new Date(`${new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" })}T00:00:00.000Z`);
    const previous = await tx.plan.findFirst({ where: { depotId, serviceDate }, orderBy: { version: "desc" } });
    const plan = await tx.plan.create({ data: { depotId, serviceDate, version: (previous?.version ?? 0) + 1, status: "PUBLISHED", publishedAt: new Date() } });
    const trip = await tx.trip.create({ data: { planId: plan.id, vehicleId: "DRIVER-DEMO-VAN", driverId: driver.id, tripNumber: 1, brand: "FRESH", district: "Colombo", status: "LOADED" } });
    for (const [index, location] of locations.entries()) {
      const order = await tx.order.create({ data: { id: `DRIVER-DEMO-ORDER-${randomUUID()}`, outletId: location.id, requestedDate: serviceDate, submittedAt: new Date(), status: "LOADED", temperatureRequired: "REEFER", units: location.units, weightKg: location.weight, volumeM3: location.volume, deliveryWindowOpen: "05:00", deliveryWindowClose: "08:00", lines: { create: { productCode: `DEMO-${index + 1}`, description: location.item, quantity: location.units, weightKg: location.weight, volumeM3: location.volume } }, statusEvents: { create: ["SUBMITTED", "ALLOCATED", "LOADED"].map((status) => ({ status, reason: "Driver demonstration data" })) } } });
      await tx.allocation.create({ data: { planId: plan.id, tripId: trip.id, orderId: order.id, sequence: index + 1 } });
    }
    await tx.notification.create({ data: { recipientId: driver.id, type: "PLAN", title: "Sample trip ready", body: "Two sample Colombo stops are ready to try.", entityType: "Trip", entityId: trip.id } });
    await tx.auditEvent.create({ data: { actorId: driver.id, entityType: "Trip", entityId: trip.id, action: "driver_demo_created", payload: { sampleData: true, stops: 2 } } });
    return { tripId: trip.id, created: true };
  }, { isolationLevel: "Serializable", timeout: 15000 });
  console.log(`${result.created ? "Created" : "Retained"} sample trip ${result.tripId} for ${email}.`);
  console.log("Use the driver's existing password. No separate driver account was created.");
} finally { await prisma.$disconnect(); }
