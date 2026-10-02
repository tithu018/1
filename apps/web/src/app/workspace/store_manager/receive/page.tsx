import { WorkspaceShell } from "@/components/workspace-shell";
import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";
import { ReceiptConfirmation } from "./receipt-confirmation";

export default async function ReceivePage() {
  const session = await requireRole("store_manager");
  const order = session.outletId ? await prisma.order.findFirst({ where: { outletId: session.outletId, status: { in: ["DELIVERED", "OUT_FOR_DELIVERY"] } }, orderBy: { updatedAt: "desc" } }) : null;
  return <WorkspaceShell role="store_manager" active="Receive"><ReceiptConfirmation orderId={order?.id ?? null} expectedUnits={order?.units ?? 0} /></WorkspaceShell>;
}
