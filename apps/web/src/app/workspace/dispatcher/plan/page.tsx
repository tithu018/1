import { WorkspaceShell } from "@/components/workspace-shell";
import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";
import { DispatcherPlanV2 } from "./planner-v2";

export default async function DispatcherPlanPage() {
  const session = await requireRole("dispatcher");
  if (!session.depotId) return <WorkspaceShell role="dispatcher" active="Plan"><p>Your dispatcher account needs a depot.</p></WorkspaceShell>;
  const [vehicles, orders] = await Promise.all([
    prisma.vehicle.findMany({ where: { depotId: session.depotId }, orderBy: { id: "asc" } }),
    prisma.order.findMany({ where: { outlet: { depotId: session.depotId }, status: { in: ["SUBMITTED", "CONFIRMED", "DEFERRED"] } }, include: { outlet: true }, orderBy: { requestedDate: "asc" } })
  ]);
  return <WorkspaceShell role="dispatcher" active="Plan"><DispatcherPlanV2 depot={session.depotId} vehicles={vehicles.map((vehicle) => ({ id: vehicle.id, depot: vehicle.depotId, type: vehicle.type.toLowerCase() as "truck" | "van", temperature: vehicle.temperature.toLowerCase() as "ambient" | "reefer", weightCapacityKg: Number(vehicle.weightCapacityKg), volumeCapacityM3: Number(vehicle.volumeCapacityM3), inWorkshop: vehicle.isInWorkshop }))} orders={orders.map((order) => ({ id: order.id, outletId: order.outletId, depot: order.outlet.depotId, brand: order.outlet.brand[0] + order.outlet.brand.slice(1).toLowerCase(), district: order.outlet.district, temperature: order.temperatureRequired === "REEFER" ? "chilled" : "ambient", parkingConstraint: (order.outlet.parkingConstraint === "van_only" || order.outlet.parkingConstraint === "mall_dock" ? order.outlet.parkingConstraint : "normal") as "normal" | "van_only" | "mall_dock", weightKg: Number(order.weightKg), volumeM3: Number(order.volumeM3) }))} /></WorkspaceShell>;
}
