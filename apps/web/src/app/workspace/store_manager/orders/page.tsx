import { WorkspaceShell } from "@/components/workspace-shell";
import { FreshOrderForm } from "./order-form";
import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";
import { RetailOrderForm } from "./retail-order-form";

export default async function PlaceOrderPage() {
  const session = await requireRole("store_manager");
  const outlet = session.outletId ? await prisma.outlet.findUnique({ where: { id: session.outletId } }) : null;
  const previous = outlet ? await prisma.order.findFirst({ where: { outletId: outlet.id, status: { not: "CANCELLED" } }, include: { lines: true }, orderBy: { createdAt: "desc" } }) : null;
  return <WorkspaceShell role="store_manager" active="Place order">{!outlet ? <p>Your account has no registered outlet.</p> : outlet.brand === "FRESH" ? <FreshOrderForm outletId={outlet.id} deliveryWindow={`${outlet.windowOpenTime}–${outlet.windowCloseTime}`} previousQuantities={Object.fromEntries(previous?.lines.map((line) => [line.productCode, line.quantity]) ?? [])} /> : <RetailOrderForm brand={outlet.brand} deliveryWindow={`${outlet.windowOpenTime}–${outlet.windowCloseTime}`} />}</WorkspaceShell>;
}
