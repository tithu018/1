import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";

export async function getDriverTrip() {
  const session = await requireRole("driver");
  return session.depotId ? prisma.trip.findFirst({ where: { plan: { depotId: session.depotId, status: "PUBLISHED" }, status: { in: ["LOADED", "OUT_FOR_DELIVERY"] } }, include: { plan: true, allocations: { include: { order: { include: { outlet: true, loadIssues: true } } }, orderBy: { sequence: "asc" } } }, orderBy: [{ plan: { serviceDate: "desc" } }, { tripNumber: "asc" }] }) : null;
}
