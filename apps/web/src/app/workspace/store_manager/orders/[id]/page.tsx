import { notFound } from "next/navigation";
import { prisma } from "@waypoint/database";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/lib/auth";
import { OrderDetail } from "./order-detail";

export default async function StoreOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("store_manager");
  const order = session.outletId ? await prisma.order.findFirst({ where: { id, outletId: session.outletId }, include: { lines: true, issues: true, statusEvents: { orderBy: { createdAt: "asc" } } } }) : null;
  if (!order) notFound();
  return <WorkspaceShell role="store_manager" active="Order status"><OrderDetail order={JSON.parse(JSON.stringify(order))} /></WorkspaceShell>;
}