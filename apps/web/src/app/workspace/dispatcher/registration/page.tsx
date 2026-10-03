import { prisma } from "@waypoint/database";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/lib/auth";
import { RegistrationDashboard } from "./registration-dashboard";

export default async function RegistrationPage() {
  const session = await requireRole("dispatcher");
  if (!session.depotId) return <WorkspaceShell role="dispatcher" active="Registration"><p>No depot assigned.</p></WorkspaceShell>;
  const [accounts, vehicles] = await Promise.all([
    prisma.account.findMany({ where: { OR: [{ depotId: session.depotId }, { outlet: { depotId: session.depotId } }] }, select: { id: true, displayName: true, email: true, role: true, outletId: true, isActive: true }, orderBy: { createdAt: "desc" } }),
    prisma.vehicle.findMany({ where: { depotId: session.depotId }, orderBy: { id: "asc" } })
  ]);
  return <WorkspaceShell role="dispatcher" active="Registration"><RegistrationDashboard depot={session.depotId} currentAccountId={session.accountId} accounts={accounts} vehicles={vehicles.map((vehicle) => ({ id: vehicle.id, type: vehicle.type, temperature: vehicle.temperature, weight: Number(vehicle.weightCapacityKg), volume: Number(vehicle.volumeCapacityM3), isInWorkshop: vehicle.isInWorkshop }))} /></WorkspaceShell>;
}
