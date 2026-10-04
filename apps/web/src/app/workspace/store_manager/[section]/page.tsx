import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@waypoint/database";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/lib/auth";
import { displayDate, label } from "@/lib/format";
import styles from "./section.module.css";
import { StorePreferences } from "./preferences";

export default async function StoreSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const titles: Record<string, string> = { status: "Order status", history: "History & issues", notifications: "Notifications", settings: "Settings" };
  if (!titles[section]) notFound();
  const session = await requireRole("store_manager");
  const [account, orders, issues, notifications] = await Promise.all([
    prisma.account.findUnique({ where: { id: session.accountId }, include: { outlet: { include: { depot: true } } } }),
    session.outletId ? prisma.order.findMany({ where: { outletId: session.outletId }, orderBy: { createdAt: "desc" } }) : [],
    session.outletId ? prisma.issueCase.findMany({ where: { order: { outletId: session.outletId } }, orderBy: { updatedAt: "desc" } }) : [],
    prisma.notification.findMany({ where: { recipientId: session.accountId }, orderBy: { createdAt: "desc" }, take: 30 })
  ]);
  const outlet = account?.outlet;
  const rows = section === "status" ? orders.filter((order) => order.status !== "CANCELLED") : orders;
  return <WorkspaceShell role="store_manager" active={titles[section]}><section className={styles.page}>
    <header className={styles.heading}><h1>{titles[section]}</h1><p>{outlet ? `${outlet.id} · ${label(outlet.brand)}` : "No outlet assigned"}</p></header>
    {(section === "status" || section === "history") && <>
      {section === "history" && <section className={styles.card}><h2>Issue cases</h2>{issues.map((issue) => <p key={issue.id}><Link href={`/workspace/store_manager/orders/${issue.orderId}`}>{issue.id}</Link> · {issue.summary} · {label(issue.status)}</p>)}{!issues.length && <p>No issue cases.</p>}</section>}
      <section className={styles.card}><h2>{section === "history" ? "Order history" : "Active orders"}</h2><div className={styles.tableWrap}><table><thead><tr><th>Order</th><th>Delivery date</th><th>Type</th><th>Units</th><th>Status</th><th /></tr></thead><tbody>{rows.map((order) => <tr key={order.id}><td>{order.id}</td><td>{displayDate(order.requestedDate)} · {order.deliveryWindowOpen}–{order.deliveryWindowClose}</td><td>{order.temperatureRequired === "REEFER" ? "Chilled" : "Ambient"}</td><td>{order.units}</td><td><span className={styles.badge}>{label(order.status)}</span></td><td><Link href={`/workspace/store_manager/orders/${order.id}`}>View / manage</Link></td></tr>)}</tbody></table></div>{!rows.length && <p>No orders yet. <Link href="/workspace/store_manager/orders">Place an order</Link></p>}<p className={styles.caption}>Submitted → Confirmed → Allocated → Loaded → Out for delivery → Delivered. Deferred orders retain a recorded reason.</p></section>
    </>}
    {section === "notifications" && <section className={`${styles.card} ${styles.notificationList}`}>{notifications.map((item) => <article key={item.id} className={item.readAt ? "" : styles.unread}><div><strong>{item.title}</strong><p>{item.body}</p><small>{displayDate(item.createdAt)}</small>{item.entityType === "Order" && item.entityId && <p><Link href={`/workspace/store_manager/orders/${item.entityId}`}>View order</Link></p>}</div></article>)}{!notifications.length && <p>No notifications yet.</p>}</section>}
    {section === "settings" && <StorePreferences accountId={session.accountId} locale={account?.locale ?? "en"} />}
    {section === "settings" && <><section className={styles.card}><h2>Outlet details</h2><dl className={styles.definitionList}>{outlet && Object.entries({ Outlet: outlet.id, Brand: label(outlet.brand), Depot: outlet.depot.name, District: outlet.district, "Delivery window": `${outlet.windowOpenTime}–${outlet.windowCloseTime}`, Dock: label(outlet.dockType), Access: label(outlet.parkingConstraint) }).map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl></section><section className={styles.card}><h2>Account</h2><p>{account?.displayName} · {account?.email} · {account?.locale}</p><Link href="/sign-in/reset">Change password</Link></section></>}
  </section></WorkspaceShell>;
}
