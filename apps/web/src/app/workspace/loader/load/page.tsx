import { WorkspaceShell } from "@/components/workspace-shell";
import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";
import { LoadChecklistV2 } from "./load-checklist-v2";

export default async function LoaderLoadPage() {
  const session = await requireRole("loader");
  const plan = session.depotId ? await prisma.plan.findFirst({ where: { depotId: session.depotId, status: "PUBLISHED" }, include: { trips: { include: { allocations: { include: { order: true } } }, orderBy: { tripNumber: "asc" } } }, orderBy: { version: "desc" } }) : null;
  const trip = plan?.trips[0];
  return <WorkspaceShell role="loader" active="Active load"><LoadChecklistV2 trip={trip?.id ?? null} vehicleId={trip?.vehicleId ?? null} stops={trip?.allocations.map((allocation) => ({ orderId: allocation.orderId, outletId: allocation.order.outletId, units: allocation.order.units, sequence: allocation.sequence })) ?? []} /></WorkspaceShell>;
}
