import { prisma } from "@waypoint/database";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/lib/auth";
import { RegistrationDashboard } from "./registration-dashboard";

export default async function RegistrationPage() {
  const session = await requireRole("dispatcher");
  if (!session.depotId) return <WorkspaceShell role="dispatcher" active="Registration"><p>No depot assigned.</p></WorkspaceShell>;
  const [depots, accounts, vehicles, outlets] = await Promise.all([
    prisma.depot.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true } }),
    prisma.account.findMany({ select: { id: true, displayName: true, email: true, role: true, outletId: true, depotId: true, isActive: true, outlet: { select: { depotId: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.vehicle.findMany({ orderBy: { id: "asc" } }),
    prisma.outlet.findMany({ select: { depotId: true, district: true }, distinct: ["depotId", "district"], orderBy: { district: "asc" } })
  ]);
  const districts = Object.fromEntries(depots.map((depot) => [depot.id, outlets.filter((outlet) => outlet.depotId === depot.id).map((outlet) => outlet.district)]));
  return <WorkspaceShell role="dispatcher" active="Registration"><RegistrationDashboard ownDepot={session.depotId} depots={depots} districts={districts} currentAccountId={session.accountId} accounts={accounts.map(({ outlet, ...account }) => ({ ...account, depotId: outlet?.depotId ?? account.depotId }))} vehicles={vehicles.map((vehicle) => ({ id: vehicle.id, depotId: vehicle.depotId, type: vehicle.type, temperature: vehicle.temperature, weight: Number(vehicle.weightCapacityKg), volume: Number(vehicle.volumeCapacityM3), isInWorkshop: vehicle.isInWorkshop }))} /></WorkspaceShell>;
}
