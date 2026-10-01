import { PrismaClient, Brand, Role, VehicleTemperature, VehicleType } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const accounts = [
  { email: "store@waypoint.demo", displayName: "Store Manager", role: Role.STORE_MANAGER, outletId: "OUT010", password: "Store123!" },
  { email: "dispatcher@waypoint.demo", displayName: "Dispatcher", role: Role.DISPATCHER, depotId: "Peliyagoda", password: "Dispatch123!" },
  { email: "loader@waypoint.demo", displayName: "Loader Terminal", role: Role.LOADER, depotId: "Peliyagoda", password: "Loader123!" },
  { email: "driver@waypoint.demo", displayName: "Driver", role: Role.DRIVER, depotId: "Peliyagoda", password: "Driver123!" }
];

async function main() {
  await prisma.depot.upsert({ where: { id: "Peliyagoda" }, update: {}, create: { id: "Peliyagoda", name: "Peliyagoda" } });
  await prisma.outlet.upsert({ where: { id: "OUT010" }, update: {}, create: { id: "OUT010", brand: Brand.FRESH, district: "Colombo", depotId: "Peliyagoda", dockType: "rear_dock", parkingConstraint: "normal", windowOpenTime: "05:00", windowCloseTime: "07:30" } });
  await prisma.vehicle.upsert({ where: { id: "VEH012" }, update: {}, create: { id: "VEH012", depotId: "Peliyagoda", type: VehicleType.TRUCK, temperature: VehicleTemperature.AMBIENT, weightCapacityKg: 4200, volumeCapacityM3: 24, kilometersPerLitre: 6.8, weeklyFuelQuotaL: 540 } });
  for (const account of accounts) {
    const { password, ...accountData } = account;
    const passwordHash = await hash(password, 12);
    await prisma.account.upsert({ where: { email: account.email }, update: { ...accountData, passwordHash }, create: { ...accountData, passwordHash } });
  }
}

main().then(() => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
