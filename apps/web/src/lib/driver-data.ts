import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";

export async function getDriverTrip() {
  const session = await requireRole("driver");
  return session.depotId ? prisma.trip.findFirst({ where: { driverId: session.accountId, plan: { depotId: session.depotId, status: "PUBLISHED" }, status: { in: ["LOADED", "OUT_FOR_DELIVERY"] } }, include: { plan: true, allocations: { include: { order: { include: { outlet: true, loadIssues: true } } }, orderBy: { sequence: "asc" } } }, orderBy: [{ status: "desc" }, { plan: { serviceDate: "asc" } }, { tripNumber: "asc" }] }) : null;
}
