import { WorkspaceShell } from "@/components/workspace-shell";
import { DriverTrip } from "./trip";
import { getDriverTrip } from "@/lib/driver-data";
import { requireRole } from "@/lib/auth";

export default async function DriverTripPage() {
  const session = await requireRole("driver");
  const trip = await getDriverTrip();
  return <WorkspaceShell role="driver" active="Active trip"><DriverTrip accountId={session.accountId} vehicleId={trip?.vehicleId ?? null} stops={trip?.allocations.map(({ order, sequence }) => ({ id: order.id, outletId: order.outletId, sequence, units: order.units, window: `${order.deliveryWindowOpen}–${order.deliveryWindowClose}`, dock: order.outlet.dockType, access: order.outlet.parkingConstraint, status: order.status, updatedAt: order.updatedAt.toISOString(), notes: order.loadIssues.map((issue) => issue.summary) })) ?? []} /></WorkspaceShell>;
}
