import { hash } from "bcryptjs";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(import.meta.dirname, "../../../.env"), override: true });
if (process.env.DATABASE_URL?.includes("@localhost:5432")) process.env.DATABASE_URL = process.env.DATABASE_URL.replace("@localhost:5432", "@127.0.0.1:5433");
const { PrismaClient, Brand, Role, VehicleTemperature, VehicleType } = await import("@prisma/client");

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to seed demo data.");
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL.replace("@localhost:", "@127.0.0.1:") } } });

const accounts = [
  { email: "store@waypoint.demo", displayName: "Fresh Store Manager", role: Role.STORE_MANAGER, outletId: "OUT010", password: "Store123!" },
  { email: "style@waypoint.demo", displayName: "Style Store Manager", role: Role.STORE_MANAGER, outletId: "OUT017", password: "Style123!" },
  { email: "tech@waypoint.demo", displayName: "Tech Store Manager", role: Role.STORE_MANAGER, outletId: "OUT022", password: "Tech123!" },
  { email: "dispatcher@waypoint.demo", displayName: "Dispatcher", role: Role.DISPATCHER, depotId: "Peliyagoda", password: "Dispatch123!" },
  { email: "loader@waypoint.demo", displayName: "Loader Terminal", role: Role.LOADER, depotId: "Peliyagoda", password: "Loader123!" },
  { email: "driver@waypoint.demo", displayName: "Driver", role: Role.DRIVER, depotId: "Peliyagoda", password: "Driver123!" }
];

const outlets = [
  { id: "OUT010", brand: Brand.FRESH, district: "Colombo", depotId: "Peliyagoda", dockType: "rear_dock", parkingConstraint: "normal", windowOpenTime: "05:00", windowCloseTime: "07:30", address: "Union Place, Colombo 02", latitude: 6.9186, longitude: 79.8612 },
  { id: "OUT017", brand: Brand.STYLE, district: "Colombo", depotId: "Peliyagoda", dockType: "mall_dock", parkingConstraint: "mall_dock", mallWindow: "06:00-08:00 service entrance", windowOpenTime: "06:00", windowCloseTime: "08:00", address: "Galle Road, Colombo 03", latitude: 6.9031, longitude: 79.8528 },
  { id: "OUT022", brand: Brand.TECH, district: "Colombo", depotId: "Peliyagoda", dockType: "front_access", parkingConstraint: "normal", windowOpenTime: "08:00", windowCloseTime: "11:00", address: "Duplication Road, Colombo 04", latitude: 6.8887, longitude: 79.8564 },
  { id: "OUT035", brand: Brand.STYLE, district: "Colombo", depotId: "Peliyagoda", dockType: "mall_dock", parkingConstraint: "mall_dock", mallWindow: "07:00-09:00 loading bay", windowOpenTime: "07:00", windowCloseTime: "09:00", address: "Battaramulla", latitude: 6.9022, longitude: 79.9182 },
  { id: "OUT075", brand: Brand.FRESH, district: "Puttalam", depotId: "Peliyagoda", dockType: "rear_dock", parkingConstraint: "van_only", windowOpenTime: "05:30", windowCloseTime: "08:00", address: "Puttalam town", latitude: 8.0362, longitude: 79.8283 }
];

const vehicles = [
  { id: "VEH005", type: VehicleType.TRUCK, temperature: VehicleTemperature.REEFER, weightCapacityKg: 6840, volumeCapacityM3: 33.4, kilometersPerLitre: 6, weeklyFuelQuotaL: 500, isInWorkshop: false },
  { id: "VEH012", type: VehicleType.TRUCK, temperature: VehicleTemperature.AMBIENT, weightCapacityKg: 4200, volumeCapacityM3: 24, kilometersPerLitre: 6.8, weeklyFuelQuotaL: 540, isInWorkshop: false },
  { id: "VEH036", type: VehicleType.VAN, temperature: VehicleTemperature.REEFER, weightCapacityKg: 1040, volumeCapacityM3: 7, kilometersPerLitre: 8.2, weeklyFuelQuotaL: 280, isInWorkshop: false },
  { id: "VEH025", type: VehicleType.TRUCK, temperature: VehicleTemperature.AMBIENT, weightCapacityKg: 3800, volumeCapacityM3: 22, kilometersPerLitre: 6, weeklyFuelQuotaL: 400, isInWorkshop: true }
];

function nextOperatingDate(now = new Date()) {
  const date = now.toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
  const hour = Number(now.toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", hourCycle: "h23" }));
  const serviceDate = new Date(`${date}T00:00:00.000Z`);
  serviceDate.setUTCDate(serviceDate.getUTCDate() + (hour >= 16 ? 2 : 1));
  return serviceDate;
}

function atDeparture(serviceDate, minutesAfter0530) {
  return new Date(serviceDate.getTime() + minutesAfter0530 * 60_000);
}

async function main() {
  const now = new Date();
  const serviceDate = nextOperatingDate(now);
  const requestedLater = new Date(serviceDate);
  requestedLater.setUTCDate(requestedLater.getUTCDate() + 1);
  const passwordHashes = new Map(await Promise.all(accounts.map(async ({ email, password }) => [email, await hash(password, 12)])));

  const summary = await prisma.$transaction(async (tx) => {
    await tx.depot.upsert({ where: { id: "Peliyagoda" }, update: { name: "Peliyagoda" }, create: { id: "Peliyagoda", name: "Peliyagoda" } });
    await tx.depot.upsert({ where: { id: "Kandy" }, update: { name: "Kandy" }, create: { id: "Kandy", name: "Kandy" } });
    for (const outlet of outlets) await tx.outlet.upsert({ where: { id: outlet.id }, update: outlet, create: outlet });
    for (const vehicle of vehicles) {
      const data = { ...vehicle, depotId: "Peliyagoda" };
      await tx.vehicle.upsert({ where: { id: vehicle.id }, update: data, create: data });
    }

    const savedAccounts = new Map();
    for (const account of accounts) {
      const { password: _password, ...accountData } = account;
      const data = { ...accountData, passwordHash: passwordHashes.get(account.email) };
      const saved = await tx.account.upsert({ where: { email: account.email }, update: data, create: data });
      savedAccounts.set(account.email, saved);
    }

    const orders = [
      { id: "ORD0096518", outletId: "OUT010", status: "ALLOCATED", temperatureRequired: VehicleTemperature.REEFER, units: 36, weightKg: 264.5, volumeM3: 1.683, deliveryWindowOpen: "05:00", deliveryWindowClose: "07:30", lines: [
        { id: "NOVA-LINE-96518-MILK", productCode: "FRESH-MILK-1L", description: "Fresh milk crates", quantity: 24, weightKg: 192, volumeM3: 1.12 },
        { id: "NOVA-LINE-96518-YOGURT", productCode: "GREEK-YOGURT", description: "Greek yoghurt cases", quantity: 12, weightKg: 72.5, volumeM3: 0.563 }
      ] },
      { id: "ORD0096654", outletId: "OUT010", status: "ALLOCATED", temperatureRequired: VehicleTemperature.REEFER, units: 30, weightKg: 293.5, volumeM3: 1.683, deliveryWindowOpen: "05:00", deliveryWindowClose: "07:30", lines: [
        { id: "NOVA-LINE-96654-PRODUCE", productCode: "FRESH-PRODUCE", description: "Fresh produce crates", quantity: 18, weightKg: 185, volumeM3: 1.04 },
        { id: "NOVA-LINE-96654-CHEESE", productCode: "CHEESE-CASE", description: "Cheese cases", quantity: 12, weightKg: 108.5, volumeM3: 0.643 }
      ] },
      { id: "ORD0096797", outletId: "OUT010", status: "LOADED", temperatureRequired: VehicleTemperature.REEFER, units: 24, weightKg: 359, volumeM3: 1.878, deliveryWindowOpen: "06:00", deliveryWindowClose: "08:00", lines: [
        { id: "NOVA-LINE-96797-JUICE", productCode: "CHILLED-JUICE", description: "Chilled juice cartons", quantity: 18, weightKg: 270, volumeM3: 1.31 },
        { id: "NOVA-LINE-96797-BUTTER", productCode: "BUTTER-CASE", description: "Butter cases", quantity: 6, weightKg: 89, volumeM3: 0.568 }
      ] },
      { id: "ORD0096821", outletId: "OUT017", status: "ALLOCATED", temperatureRequired: VehicleTemperature.AMBIENT, units: 32, weightKg: 657.5, volumeM3: 5.213, deliveryWindowOpen: "06:00", deliveryWindowClose: "08:00", lines: [
        { id: "NOVA-LINE-96821-POLO", productCode: "STYLE-POLO", description: "Polo shirt cartons", quantity: 18, weightKg: 337.5, volumeM3: 2.613 },
        { id: "NOVA-LINE-96821-DENIM", productCode: "STYLE-DENIM", description: "Denim cartons", quantity: 14, weightKg: 320, volumeM3: 2.6 }
      ] },
      { id: "ORD0096862", outletId: "OUT075", status: "DEFERRED", temperatureRequired: VehicleTemperature.REEFER, units: 40, weightKg: 1200, volumeM3: 8, deliveryWindowOpen: "05:30", deliveryWindowClose: "08:00", lines: [
        { id: "NOVA-LINE-96862-FROZEN", productCode: "FROZEN-ASSORTED", description: "Frozen assorted cases", quantity: 40, weightKg: 1200, volumeM3: 8 }
      ] }
    ];

    for (const order of orders) {
      const { lines, ...orderData } = order;
      const data = { ...orderData, requestedDate: order.status === "DEFERRED" ? requestedLater : serviceDate, submittedAt: new Date(now.getTime() - 3_600_000) };
      await tx.order.upsert({ where: { id: order.id }, update: data, create: data });
      await tx.orderLine.deleteMany({ where: { orderId: order.id, id: { notIn: lines.map((line) => line.id) } } });
      for (const line of lines) await tx.orderLine.upsert({ where: { id: line.id }, update: { ...line, orderId: order.id }, create: { ...line, orderId: order.id } });
      await tx.orderStatusEvent.upsert({ where: { id: `NOVA-EVENT-${order.id}-${order.status}` }, update: { status: order.status, reason: order.status === "DEFERRED" ? "Reefer van capacity exceeded; moved to the next run." : "NOVA demonstration workflow" }, create: { id: `NOVA-EVENT-${order.id}-${order.status}`, orderId: order.id, status: order.status, reason: order.status === "DEFERRED" ? "Reefer van capacity exceeded; moved to the next run." : "NOVA demonstration workflow" } });
    }

    const demoPlanId = "NOVA-DEMO-PLAN-PELIYAGODA";
    const nonDemoPublished = await tx.plan.findFirst({ where: { depotId: "Peliyagoda", status: "PUBLISHED", id: { not: demoPlanId } }, select: { id: true } });
    if (nonDemoPublished) {
      await tx.plan.updateMany({ where: { id: demoPlanId }, data: { status: "SUPERSEDED" } });
      return { serviceDate, planCreated: false, reason: "an existing published operational plan was preserved" };
    }

    await tx.notification.deleteMany({ where: { id: { startsWith: "NOVA-DEMO-NOTIFICATION-" } } });
    await tx.loadIssue.deleteMany({ where: { id: { startsWith: "NOVA-DEMO-LOAD-ISSUE-" } } });
    await tx.issueCase.deleteMany({ where: { id: { startsWith: "NOVA-DEMO-ISSUE-" } } });
    await tx.plan.deleteMany({ where: { id: demoPlanId } });
    const latest = await tx.plan.findFirst({ where: { depotId: "Peliyagoda", serviceDate }, orderBy: { version: "desc" }, select: { version: true } });
    const version = (latest?.version ?? 0) + 1;
    await tx.plan.create({ data: { id: demoPlanId, depotId: "Peliyagoda", serviceDate, version, status: "PUBLISHED", publishedAt: now } });

    const loader = savedAccounts.get("loader@waypoint.demo");
    const driver = savedAccounts.get("driver@waypoint.demo");
    const freshManager = savedAccounts.get("store@waypoint.demo");
    if (!loader || !driver || !freshManager) throw new Error("Demo accounts were not created.");

    await tx.trip.create({ data: { id: "NOVA-DEMO-TRIP-PENDING", planId: demoPlanId, vehicleId: "VEH005", tripNumber: 1, brand: Brand.FRESH, district: "Colombo", status: "ALLOCATED", plannedStart: atDeparture(serviceDate, 0), allocations: { create: [
      { id: "NOVA-ALLOC-96518", planId: demoPlanId, orderId: "ORD0096518", sequence: 1 },
      { id: "NOVA-ALLOC-96654", planId: demoPlanId, orderId: "ORD0096654", sequence: 2 }
    ] } } });

    await tx.trip.create({ data: { id: "NOVA-DEMO-TRIP-LOADING", planId: demoPlanId, vehicleId: "VEH012", tripNumber: 2, brand: Brand.STYLE, district: "Colombo", status: "ALLOCATED", plannedStart: atDeparture(serviceDate, 45), allocations: { create: [{ id: "NOVA-ALLOC-96821", planId: demoPlanId, orderId: "ORD0096821", sequence: 1 }] }, loadSession: { create: { id: "NOVA-DEMO-LOAD-SESSION-ACTIVE", planVersion: version, vehicleIdSnapshot: "VEH012", status: "LOADING", loadingOrderAcknowledgedAt: new Date(now.getTime() - 900_000), lines: { create: [
      { id: "NOVA-LOAD-LINE-96821-POLO", lineKey: "line:NOVA-LINE-96821-POLO", orderId: "ORD0096821", orderLineId: "NOVA-LINE-96821-POLO", plannedQuantity: 18, loadedQuantity: 18 },
      { id: "NOVA-LOAD-LINE-96821-DENIM", lineKey: "line:NOVA-LINE-96821-DENIM", orderId: "ORD0096821", orderLineId: "NOVA-LINE-96821-DENIM", plannedQuantity: 14, loadedQuantity: 0 }
    ] } } } } });

    await tx.trip.create({ data: { id: "NOVA-DEMO-TRIP-LOADED", planId: demoPlanId, vehicleId: "VEH036", tripNumber: 3, brand: Brand.FRESH, district: "Colombo", status: "LOADED", plannedStart: atDeparture(serviceDate, 90), driverId: driver.id, allocations: { create: [{ id: "NOVA-ALLOC-96797", planId: demoPlanId, orderId: "ORD0096797", sequence: 1 }] }, loadSession: { create: { id: "NOVA-DEMO-LOAD-SESSION-CONFIRMED", planVersion: version, vehicleIdSnapshot: "VEH036", status: "CONFIRMED", loadingOrderAcknowledgedAt: new Date(now.getTime() - 1_800_000), reeferTemperatureC: 3.8, reeferConfirmedAt: new Date(now.getTime() - 1_700_000), confirmedAt: new Date(now.getTime() - 1_200_000), confirmedById: loader.id, lines: { create: [
      { id: "NOVA-LOAD-LINE-96797-JUICE", lineKey: "line:NOVA-LINE-96797-JUICE", orderId: "ORD0096797", orderLineId: "NOVA-LINE-96797-JUICE", plannedQuantity: 18, loadedQuantity: 18 },
      { id: "NOVA-LOAD-LINE-96797-BUTTER", lineKey: "line:NOVA-LINE-96797-BUTTER", orderId: "ORD0096797", orderLineId: "NOVA-LINE-96797-BUTTER", plannedQuantity: 6, loadedQuantity: 4 }
    ] } } } } });

    await tx.issueCase.create({ data: { id: "NOVA-DEMO-ISSUE-DAMAGED", orderId: "ORD0096797", status: "REPORTED", summary: "Damaged: Butter cases", openedById: loader.id } });
    await tx.loadIssue.create({ data: { id: "NOVA-DEMO-LOAD-ISSUE-DAMAGED", tripId: "NOVA-DEMO-TRIP-LOADED", orderId: "ORD0096797", issueId: "NOVA-DEMO-ISSUE-DAMAGED", orderLineId: "NOVA-LINE-96797-BUTTER", lineKey: "line:NOVA-LINE-96797-BUTTER", type: "DAMAGED", summary: "Damaged: Butter cases", quantity: 2, note: "Two crushed cases isolated at the loading bay.", createdById: loader.id } });
    await tx.notification.createMany({ data: [
      { id: "NOVA-DEMO-NOTIFICATION-STORE-DAMAGE", recipientId: freshManager.id, type: "LOAD", title: "Damaged during loading", body: "2 × Butter cases · ORD0096797 · VEH036", entityType: "Order", entityId: "ORD0096797" },
      { id: "NOVA-DEMO-NOTIFICATION-DRIVER-LOAD", recipientId: driver.id, type: "LOAD", title: "Trip ready for hand-off", body: "VEH036 · Trip 3 · one documented shortfall", entityType: "Trip", entityId: "NOVA-DEMO-TRIP-LOADED" }
    ] });
    await tx.auditEvent.upsert({ where: { id: "NOVA-DEMO-AUDIT-PLAN" }, update: { actorId: savedAccounts.get("dispatcher@waypoint.demo")?.id, payload: { sampleData: true, version, trips: 3 } }, create: { id: "NOVA-DEMO-AUDIT-PLAN", actorId: savedAccounts.get("dispatcher@waypoint.demo")?.id, entityType: "Plan", entityId: demoPlanId, action: "demo_plan_seeded", payload: { sampleData: true, version, trips: 3 } } });
    return { serviceDate, planCreated: true, version };
  }, { timeout: 30_000 });

  console.log(summary.planCreated
    ? `Seeded NOVA demo data for ${summary.serviceDate.toISOString().slice(0, 10)}: 5 orders, 3 trips and 1 loading issue (Plan v${summary.version}).`
    : `Seeded demo master data; ${summary.reason}.`);
}

main().then(() => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
