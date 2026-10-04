import { WorkspaceShell } from "@/components/workspace-shell";
import { DriverSyncClient } from "./sync-client";
import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";

export default async function DriverSyncPage() {
  const session = await requireRole("driver");
  const records = await prisma.syncOperation.findMany({ where: { accountId: session.accountId }, select: { id: true, operationId: true, entityId: true, status: true, createdAt: true, payload: true, serverPayload: true }, orderBy: { createdAt: "desc" }, take: 50 });
  return <WorkspaceShell role="driver" active="Sync"><DriverSyncClient accountId={session.accountId} records={records.map((record) => ({ id: record.id, operationId: record.operationId, entityId: record.entityId, status: record.status, createdAt: record.createdAt.toISOString(), clientOutcome: String((record.payload as { outcome?: string })?.outcome ?? "Unknown"), serverStatus: String((record.serverPayload as { status?: string } | null)?.status ?? "Unknown") }))} /></WorkspaceShell>;
}
