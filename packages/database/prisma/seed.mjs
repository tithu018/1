import { hash } from "bcryptjs";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(import.meta.dirname, "../../../.env"), override: true });
const { PrismaClient, Brand, Role, VehicleTemperature, VehicleType } = await import("@prisma/client");

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const accounts = [
  { email: "store@waypoint.demo", displayName: "Store Manager", role: Role.STORE_MANAGER, outletId: "OUT010", password: "Store123!" },
  { email: "dispatcher@waypoint.demo", displayName: "Dispatcher", role: Role.DISPATCHER, depotId: "Peliyagoda", password: "Dispatch123!" },
  { email: "loader@waypoint.demo", displayName: "Loader Terminal", role: Role.LOADER, depotId: "Peliyagoda", password: "Loader123!" },
  { email: "driver@waypoint.demo", displayName: "Driver", role: Role.DRIVER, depotId: "Peliyagoda", password: "Driver123!" }
];

async function main() {
  await prisma.depot.upsert({ where: { id: "Peliyagoda" }, update: {}, create: { id: "Peliyagoda", name: "Peliyagoda" } });
  await prisma.outlet.upsert({ where: { id: "OUT010" }, update: {}, create: { id: "OUT010", brand: Brand.FRESH, district: "Colombo", depotId: "Peliyagoda", dockType: "rear_dock", parkingConstraint: "normal", windowOpenTime: "05:00", windowCloseTime: "07:30" } });
  await prisma.outlet.upsert({ where: { id: "OUT035" }, update: {}, create: { id: "OUT035", brand: Brand.STYLE, district: "Colombo", depotId: "Peliyagoda", dockType: "mall_dock", parkingConstraint: "mall_dock", windowOpenTime: "05:00", windowCloseTime: "07:30" } });
  await prisma.outlet.upsert({ where: { id: "OUT075" }, update: {}, create: { id: "OUT075", brand: Brand.FRESH, district: "Puttalam", depotId: "Peliyagoda", dockType: "rear_dock", parkingConstraint: "van_only", windowOpenTime: "05:00", windowCloseTime: "07:30" } });
  await prisma.vehicle.upsert({ where: { id: "VEH012" }, update: {}, create: { id: "VEH012", depotId: "Peliyagoda", type: VehicleType.TRUCK, temperature: VehicleTemperature.AMBIENT, weightCapacityKg: 4200, volumeCapacityM3: 24, kilometersPerLitre: 6.8, weeklyFuelQuotaL: 540 } });
  for (const vehicle of [{ id: "VEH005", type: VehicleType.TRUCK, temperature: VehicleTemperature.REEFER, weightCapacityKg: 6840, volumeCapacityM3: 33.4, isInWorkshop: false }, { id: "VEH036", type: VehicleType.VAN, temperature: VehicleTemperature.REEFER, weightCapacityKg: 1040, volumeCapacityM3: 7, isInWorkshop: false }, { id: "VEH025", type: VehicleType.TRUCK, temperature: VehicleTemperature.AMBIENT, weightCapacityKg: 3800, volumeCapacityM3: 22, isInWorkshop: true }]) await prisma.vehicle.upsert({ where: { id: vehicle.id }, update: {}, create: { ...vehicle, depotId: "Peliyagoda", kilometersPerLitre: 6, weeklyFuelQuotaL: 400 } });
  for (const order of [{ id: "ORD0096518", outletId: "OUT010", weightKg: 264.5, volumeM3: 1.683, temperatureRequired: VehicleTemperature.REEFER }, { id: "ORD0096654", outletId: "OUT010", weightKg: 293.5, volumeM3: 1.683, temperatureRequired: VehicleTemperature.REEFER }, { id: "ORD0096797", outletId: "OUT010", weightKg: 359, volumeM3: 1.878, temperatureRequired: VehicleTemperature.AMBIENT }, { id: "ORD0096821", outletId: "OUT035", weightKg: 657.5, volumeM3: 10.213, temperatureRequired: VehicleTemperature.AMBIENT }, { id: "ORD0096862", outletId: "OUT075", weightKg: 1200, volumeM3: 40, temperatureRequired: VehicleTemperature.REEFER }]) await prisma.order.upsert({ where: { id: order.id }, update: {}, create: { ...order, requestedDate: new Date(), status: "CONFIRMED", units: 1, deliveryWindowOpen: "05:00", deliveryWindowClose: "07:30" } });
  for (const account of accounts) {
    const { password, ...accountData } = account;
    const passwordHash = await hash(password, 12);
    await prisma.account.upsert({ where: { email: account.email }, update: { ...accountData, passwordHash }, create: { ...accountData, passwordHash } });
  }
}

main().then(() => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
