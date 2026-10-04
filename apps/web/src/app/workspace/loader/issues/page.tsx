import { WorkspaceShell } from "@/components/workspace-shell";
import { IssuesPanel } from "./issues-panel";
import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";
import { displayDate, displayTime, label } from "@/lib/format";

export default async function LoadingIssuesPage() {
  const session = await requireRole("loader");
  const issues = session.depotId ? await prisma.loadIssue.findMany({ where: { trip: { plan: { depotId: session.depotId } } }, include: { trip: true, order: true, issue: true }, orderBy: { createdAt: "desc" } }) : [];
  return <WorkspaceShell role="loader" active="Loading issues"><IssuesPanel issues={issues.map((issue) => ({ id: issue.id, day: issue.createdAt.toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" }), flagged: `${displayDate(issue.createdAt)} · ${displayTime(issue.createdAt)}`, vehicle: issue.trip.vehicleId, outletOrder: `${issue.order.outletId} · ${issue.orderId}`, product: issue.summary, problem: `${label(issue.type)} · ${issue.quantity ?? "—"}${issue.note ? ` · ${issue.note}` : ""}`, status: label(issue.issue?.status ?? "REPORTED"), hasPhoto: Boolean(issue.photoData), withdrawn: Boolean(issue.withdrawnAt) }))} /></WorkspaceShell>;
}
