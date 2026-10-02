import { WorkspaceShell } from "@/components/workspace-shell";
import { IssuesPanel } from "./issues-panel";
import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";
import { displayDate, displayTime, label } from "@/lib/format";

export default async function LoadingIssuesPage() {
  const session = await requireRole("loader");
  const issues = session.depotId ? await prisma.loadIssue.findMany({ where: { trip: { plan: { depotId: session.depotId } } }, include: { trip: true, order: true, issue: true }, orderBy: { createdAt: "desc" } }) : [];
  return (
    <WorkspaceShell role="loader" active="Loading issues">
      <IssuesPanel issues={issues.map((issue) => ({ day: issue.createdAt.toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" }), row: [`${displayDate(issue.createdAt)} · ${displayTime(issue.createdAt)}`, issue.trip.vehicleId, `${issue.order.outletId} · ${issue.orderId}`, issue.summary, `${issue.quantity ?? ""} ${issue.note ?? ""}`, label(issue.issue?.status ?? "REPORTED")] }))} />
    </WorkspaceShell>
  );
}
