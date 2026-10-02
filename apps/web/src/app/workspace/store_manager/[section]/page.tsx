import { notFound } from "next/navigation";
import { prisma } from "@waypoint/database";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/lib/auth";
import styles from "./section.module.css";

export default async function StoreSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!["status", "history", "notifications", "settings"].includes(section)) notFound();
  const session = await requireRole("store_manager");
  if (!session.outletId) notFound();
  const outlet = await prisma.outlet.findUnique({ where: { id: session.outletId }, include: { orders: { include: { issues: true, statusEvents: true }, orderBy: { updatedAt: "desc" }, take: 20 } } });
  if (!outlet) notFound();
  const notifications = await prisma.notification.findMany({ where: { recipientId: session.accountId }, orderBy: { createdAt: "desc" }, take: 30 });
  const latestOrder = outlet.orders[0];
  const title = section === "status" ? (latestOrder ? `${latestOrder.id} - ${latestOrder.temperatureRequired === "REEFER" ? "Chilled" : "Dry"}` : "Order status") : section === "history" ? `Orders and issue cases for ${outlet.id}` : section === "notifications" ? "Notifications" : "Notifications and outlet details";
  const subtitle = section === "status" ? (latestOrder ? `Delivery window ${latestOrder.deliveryWindowOpen}-${latestOrder.deliveryWindowClose}` : "No orders have been submitted yet") : section === "history" ? "Shared order history and issue resolution" : section === "notifications" ? `${outlet.id} - ${outlet.orders.length} recent order events` : `${outlet.district} - Peliyagoda depot`;
  const rows = section === "status" && latestOrder
    ? latestOrder.statusEvents.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map((event) => [event.status.replaceAll("_", " "), event.reason ?? event.createdAt.toLocaleString("en-GB")])
    : section === "history"
      ? outlet.orders.flatMap((order) => [[order.id, `${order.status.replaceAll("_", " ")} - ${order.units} units`], ...order.issues.map((issue) => [issue.id, `${issue.summary} - ${issue.status.replaceAll("_", " ")}`])])
      : section === "notifications"
        ? notifications.map((notification) => [notification.title, `${notification.body}${notification.readAt ? " - Read" : " - Unread"}`])
        : [["Outlet", `${outlet.id} - ${outlet.brand}`], ["Delivery window", `${outlet.windowOpenTime}-${outlet.windowCloseTime}`], ["Dock", outlet.dockType], ["Parking", outlet.parkingConstraint], ["Planned closure", "No closure recorded"]];

  return (
    <WorkspaceShell role="store_manager" active={section === "status" ? "Order status" : section === "history" ? "History & issues" : section === "notifications" ? "Notifications" : "Settings"}>
      <section className={styles.page}>
        <header><h1>{title}</h1><p>{subtitle}</p></header>
        <section className={styles.card}>
          {rows.length ? rows.map(([rowTitle, detail], index) => <article key={`${rowTitle}-${index}`}><strong>{rowTitle}</strong><span>{detail}</span></article>) : <article><strong>Nothing to show yet</strong><span>New records will appear here after a server-confirmed action.</span></article>}
        </section>
      </section>
    </WorkspaceShell>
  );
}
