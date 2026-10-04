import { notFound } from "next/navigation";
import { prisma } from "@waypoint/database";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/lib/auth";
import { IssueDetail } from "./issue-detail";

export default async function DispatcherIssuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("dispatcher");
  const issue = session.depotId ? await prisma.issueCase.findFirst({ where: { id, order: { outlet: { depotId: session.depotId } } }, include: { order: { include: { outlet: true, proofAssets: true, deliveryOutcome: true, receipt: true } }, events: { orderBy: { createdAt: "asc" }, include: { actor: { select: { displayName: true } } } }, loadIssue: true } }) : null;
  if (!issue) notFound();
  return <WorkspaceShell role="dispatcher" active="Needs Attention"><IssueDetail key={`${issue.id}-${issue.updatedAt.toISOString()}`} issue={JSON.parse(JSON.stringify(issue))} /></WorkspaceShell>;
}
