import { WorkspaceShell } from "@/components/workspace-shell";
import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";
import { nextServiceDate, parseServiceDate } from "@/lib/operating-date";
import { DispatcherPlanV2 } from "./planner-v2";
import { planningQueueWhere } from "@/lib/dispatcher-data";

export default async function DispatcherPlanPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const session = await requireRole("dispatcher");
  if (!session.depotId) return <WorkspaceShell role="dispatcher" active="Plan"><p>No depot assigned.</p></WorkspaceShell>;
  const { date } = await searchParams;
  let serviceDate = nextServiceDate();
  try { if (date) serviceDate = parseServiceDate(date); } catch { return <WorkspaceShell role="dispatcher" active="Plan"><p>Choose a valid service date.</p></WorkspaceShell>; }
  const [vehicles, orders, drivers, latest] = await Promise.all([
    prisma.vehicle.findMany({ where: { depotId: session.depotId }, orderBy: { id: "asc" } }),
    prisma.order.findMany({ where: planningQueueWhere(session.depotId, serviceDate), include: { outlet: true }, orderBy: [{ requestedDate: "asc" }, { createdAt: "asc" }] }),
    prisma.account.findMany({ where: { role: "DRIVER", isActive: true, depotId: session.depotId }, select: { id: true, displayName: true } }),
    prisma.plan.findFirst({ where: { depotId: session.depotId, serviceDate }, orderBy: { version: "desc" }, include: { trips: { select: { status: true } } } })
  ]);
  const day = serviceDate.toISOString().slice(0, 10);
  return <WorkspaceShell role="dispatcher" active="Plan"><DispatcherPlanV2 key={day} locked={latest?.trips.some((trip) => ["OUT_FOR_DELIVERY", "DELIVERED"].includes(trip.status)) ?? false} depot={session.depotId} serviceDate={day} expectedVersion={latest?.version ?? null} drivers={drivers} vehicles={vehicles.map((vehicle) => ({ id: vehicle.id, depot: vehicle.depotId, type: vehicle.type.toLowerCase() as "truck" | "van", temperature: vehicle.temperature.toLowerCase() as "ambient" | "reefer", weightCapacityKg: Number(vehicle.weightCapacityKg), volumeCapacityM3: Number(vehicle.volumeCapacityM3), inWorkshop: vehicle.isInWorkshop }))} orders={orders.map((order) => ({ id: order.id, outletId: order.outletId, depot: order.outlet.depotId, brand: order.outlet.brand, district: order.outlet.district, temperature: order.temperatureRequired === "REEFER" ? "chilled" : "ambient", parkingConstraint: (order.outlet.parkingConstraint === "van_only" || order.outlet.parkingConstraint === "mall_dock" ? order.outlet.parkingConstraint : "normal") as "normal" | "van_only" | "mall_dock", weightKg: Number(order.weightKg), volumeM3: Number(order.volumeM3) }))} /></WorkspaceShell>;
}
