import { hash } from "bcryptjs";
import { config } from "dotenv";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(import.meta.dirname, "../../../.env"), override: true });
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL?.replace("@localhost:5432", "@127.0.0.1:5433") } } });
const depotId = "DRIVER-DEMO", email = "driver.preview@waypoint.demo";
const password = process.env.DRIVER_DEMO_PASSWORD ?? "DriverPreview123!";
const locations = [
  { id: "DRIVER-DEMO-FORT", address: "Demo stop near Colombo Fort", latitude: 6.9344, longitude: 79.8428, dockType: "rear_dock", units: 12, item: "Chilled cartons", weight: 120, volume: .8 },
  { id: "DRIVER-DEMO-BORELLA", address: "Demo stop near Borella", latitude: 6.9147, longitude: 79.8778, dockType: "street", units: 8, item: "Fresh produce crates", weight: 80, volume: .6 }
];

try {
  if (password.length < 12 || Buffer.byteLength(password) > 72) throw new Error("DRIVER_DEMO_PASSWORD must be 12+ characters and at most 72 bytes.");
  const passwordHash = await hash(password, 12);
  const result = await prisma.$transaction(async (tx) => {
    const existingDepot = await tx.depot.findUnique({ where: { id: depotId } });
    if (existingDepot && existingDepot.name !== "Driver demo · sample data") throw new Error("Demo depot ID belongs to another dataset.");
    await tx.depot.upsert({ where: { id: depotId }, update: {}, create: { id: depotId, name: "Driver demo · sample data" } });
    const existingAccount = await tx.account.findUnique({ where: { email } });
    if (existingAccount && (existingAccount.depotId !== depotId || existingAccount.role !== "DRIVER")) throw new Error("Demo email belongs to another account.");
    // Reruns preserve the driver's password and all existing delivery evidence.
    const driver = existingAccount ?? await tx.account.create({ data: { email, displayName: "Demo Driver", passwordHash, role: "DRIVER", depotId } });
    if (!driver.isActive) throw new Error("Demo driver is inactive. Activate it before adding a trip.");
    const active = await tx.trip.findFirst({ where: { driverId: driver.id, plan: { depotId, status: "PUBLISHED" }, status: { in: ["LOADED", "OUT_FOR_DELIVERY"] } } });
    if (active) return { tripId: active.id, created: false };
    for (const location of locations) {
      const existing = await tx.outlet.findUnique({ where: { id: location.id } });
      if (existing && existing.depotId !== depotId) throw new Error("Demo outlet ID belongs to another depot.");
      await tx.outlet.upsert({ where: { id: location.id }, update: {}, create: { id: location.id, depotId, brand: "FRESH", district: "Colombo", address: location.address, latitude: location.latitude, longitude: location.longitude, dockType: location.dockType, parkingConstraint: "van_only", windowOpenTime: "05:00", windowCloseTime: "08:00" } });
    }
    const vehicle = await tx.vehicle.findUnique({ where: { id: "DRIVER-DEMO-VAN" } });
    if (vehicle && vehicle.depotId !== depotId) throw new Error("Demo vehicle ID belongs to another depot.");
    await tx.vehicle.upsert({ where: { id: "DRIVER-DEMO-VAN" }, update: {}, create: { id: "DRIVER-DEMO-VAN", depotId, type: "VAN", temperature: "REEFER", weightCapacityKg: 1000, volumeCapacityM3: 7, kilometersPerLitre: 8, weeklyFuelQuotaL: 150 } });
    const serviceDate = new Date(`${new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" })}T00:00:00.000Z`);
    const previous = await tx.plan.findFirst({ where: { depotId, serviceDate }, orderBy: { version: "desc" } });
    const plan = await tx.plan.create({ data: { depotId, serviceDate, version: (previous?.version ?? 0) + 1, status: "PUBLISHED", publishedAt: new Date() } });
    const trip = await tx.trip.create({ data: { planId: plan.id, vehicleId: "DRIVER-DEMO-VAN", driverId: driver.id, tripNumber: 1, brand: "FRESH", district: "Colombo", status: "LOADED" } });
    for (const [index, location] of locations.entries()) {
      const order = await tx.order.create({ data: { id: `DRIVER-DEMO-ORDER-${randomUUID()}`, outletId: location.id, requestedDate: serviceDate, submittedAt: new Date(), status: "LOADED", temperatureRequired: "REEFER", units: location.units, weightKg: location.weight, volumeM3: location.volume, deliveryWindowOpen: "05:00", deliveryWindowClose: "08:00", lines: { create: { productCode: `DEMO-${index + 1}`, description: location.item, quantity: location.units, weightKg: location.weight, volumeM3: location.volume } }, statusEvents: { create: ["SUBMITTED", "ALLOCATED", "LOADED"].map((status) => ({ status, reason: "Driver demonstration data" })) } } });
      await tx.allocation.create({ data: { planId: plan.id, tripId: trip.id, orderId: order.id, sequence: index + 1 } });
    }
    await tx.notification.create({ data: { recipientId: driver.id, type: "PLAN", title: "Demo trip ready", body: "Two sample stops in Colombo. Start the trip to test delivery and sync.", entityType: "Trip", entityId: trip.id } });
    await tx.auditEvent.create({ data: { actorId: driver.id, entityType: "Trip", entityId: trip.id, action: "driver_demo_created", payload: { sampleData: true, stops: 2 } } });
    return { tripId: trip.id, created: true };
  }, { isolationLevel: "Serializable", timeout: 15000 });
  console.log(`${result.created ? "Created" : "Retained"} driver demo trip ${result.tripId}.`);
  console.log(`Driver sign-in: ${email}`);
  if (!process.env.DRIVER_DEMO_PASSWORD) console.log(`Initial demo password: ${password} (existing passwords are never changed).`);
  console.log("Only the isolated DRIVER-DEMO depot is used. Run again after completing the trip to add another demo run.");
} finally { await prisma.$disconnect(); }
