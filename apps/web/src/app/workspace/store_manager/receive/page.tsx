import { WorkspaceShell } from "@/components/workspace-shell";
import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";
import { ReceiptConfirmation } from "./receipt-confirmation";

export default async function ReceivePage() {
  const session = await requireRole("store_manager");
  const order = session.outletId ? await prisma.order.findFirst({ where: { outletId: session.outletId, status: "DELIVERED", receipt: { is: null } }, include: { lines: true, outlet: true, loadIssues: true }, orderBy: { updatedAt: "desc" } }) : null;
  const items = order?.lines.map((line) => ({ code: line.id, name: `${line.description} · ${line.productCode}`, expected: line.quantity })) ?? [];
  if (order && !items.length) items.push({ code: order.id, name: "Order units", expected: order.units });
  return <WorkspaceShell role="store_manager" active="Receive"><ReceiptConfirmation orderId={order?.id ?? null} expectedUnits={order?.units ?? 0} items={items} brand={order?.outlet.brand ?? ""} loaderNotes={order?.loadIssues.map((issue) => issue.summary) ?? []} /></WorkspaceShell>;
}
