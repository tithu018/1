import { WorkspaceShell } from "@/components/workspace-shell";
import { DriverSyncClient } from "./sync-client";
import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";

export default async function DriverSyncPage() {
  const session = await requireRole("driver");
  const records = await prisma.syncOperation.findMany({ where: { accountId: session.accountId }, select: { id: true, operationId: true, entityId: true, status: true }, orderBy: { createdAt: "desc" }, take: 50 });
  return <WorkspaceShell role="driver" active="Sync"><DriverSyncClient accountId={session.accountId} records={records} /></WorkspaceShell>;
}
