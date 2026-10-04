import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@waypoint/database";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/lib/auth";
import { displayDate, label } from "@/lib/format";
import styles from "./section.module.css";
import { StorePreferences } from "./preferences";
import { NotificationsList } from "./notifications-list";

function shortOrderReference(orderId: string) {
  const raw = orderId.replace(/^ORD-/i, "").replace(/[^a-z0-9]/gi, "");
  const numeric = raw.match(/\d+/g)?.join("") ?? "";
  if (numeric.length >= 4) return `ORD-${numeric.slice(-4)}`;
  const value = raw || orderId;
  const hashed = [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 9000, 0);
  return `ORD-${1000 + hashed}`;
}

function notificationTitle(type: string, title: string, body: string) {
  const value = `${title} ${body}`.toLowerCase();
  if (type === "ORDER") return value.includes("receipt") ? "Receipt confirmed" : "Order update";
  if (type === "DELIVERY") return value.includes("needs attention") ? "Delivery needs attention" : "Delivery completed";
  if (type === "ISSUE") return value.includes("resolved") ? "Issue resolved" : value.includes("receipt") || value.includes("reported") ? "Issue reported" : "Issue update";
  if (type === "LOAD") return "Loading update";
  if (type === "PLAN") return "Plan update";
  return title;
}

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
  const orderEntityIds = notifications.filter((item) => item.entityType === "Order" && item.entityId).map((item) => item.entityId!);
  const issueEntityIds = notifications.filter((item) => item.entityType === "IssueCase" && item.entityId).map((item) => item.entityId!);
  const [notificationOrders, notificationIssues] = section === "notifications" && session.outletId ? await Promise.all([
    prisma.order.findMany({ where: { id: { in: orderEntityIds }, outletId: session.outletId }, select: { id: true } }),
    prisma.issueCase.findMany({ where: { id: { in: issueEntityIds }, order: { outletId: session.outletId } }, select: { id: true, orderId: true } })
  ]) : [[], []];
  const orderLookup = new Map(notificationOrders.map((order) => [order.id, order.id]));
  const issueLookup = new Map(notificationIssues.map((issue) => [issue.id, issue.orderId]));
  const notificationRows = notifications.map((item) => {
    const orderId = (item.entityType === "Order" && item.entityId
      ? orderLookup.get(item.entityId)
      : item.entityType === "IssueCase" && item.entityId
        ? issueLookup.get(item.entityId)
        : null) ?? null;
    const orderRef = orderId ? shortOrderReference(orderId) : null;

    return {
      id: item.id,
      type: item.type,
      title: notificationTitle(item.type, item.title, item.body),
      message: orderId && orderRef ? item.body.replaceAll(orderId, orderRef) : item.body,
      orderId,
      orderRef,
      createdAt: item.createdAt.toISOString(),
      readAt: item.readAt?.toISOString() ?? null,
      href: orderId ? `/workspace/store_manager/orders/${orderId}` : "/workspace/store_manager/notifications"
    };
  });

  return (
    <WorkspaceShell role="store_manager" active={titles[section]}>
      <section className={`${styles.page} ${section === "notifications" ? styles.notificationPageShell : ""}`}>
        {section !== "notifications" && (
          <header className={styles.heading}>
            <h1>{titles[section]}</h1>
            <p>{outlet ? `${outlet.id} · ${label(outlet.brand)}` : "No outlet assigned"}</p>
          </header>
        )}

        {(section === "status" || section === "history") && (
          <>
            {section === "history" && (
              <section className={styles.card}>
                <h2>Issue cases</h2>
                {issues.map((issue) => (
                  <p key={issue.id}>
                    <Link href={`/workspace/store_manager/orders/${issue.orderId}`}>{issue.id}</Link> · {issue.summary} · {label(issue.status)}
                  </p>
                ))}
                {!issues.length && <p>No issue cases.</p>}
              </section>
            )}
            <section className={styles.card}>
              <h2>{section === "history" ? "Order history" : "Active orders"}</h2>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr><th>Order</th><th>Delivery date</th><th>Type</th><th>Units</th><th>Status</th><th /></tr>
                  </thead>
                  <tbody>
                    {rows.map((order) => (
                      <tr key={order.id}>
                        <td>{order.id}</td>
                        <td>{displayDate(order.requestedDate)} · {order.deliveryWindowOpen}-{order.deliveryWindowClose}</td>
                        <td>{order.temperatureRequired === "REEFER" ? "Chilled" : "Ambient"}</td>
                        <td>{order.units}</td>
                        <td><span className={styles.badge}>{label(order.status)}</span></td>
                        <td><Link href={`/workspace/store_manager/orders/${order.id}`}>View / manage</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!rows.length && <p>No orders yet. <Link href="/workspace/store_manager/orders">Place an order</Link></p>}
              <p className={styles.caption}>Submitted to Confirmed to Allocated to Loaded to Out for delivery to Delivered. Deferred orders retain a recorded reason.</p>
            </section>
          </>
        )}

        {section === "notifications" && <NotificationsList notifications={notificationRows} />}

        {section === "settings" && <StorePreferences accountId={session.accountId} locale={account?.locale ?? "en"} />}
        {section === "settings" && (
          <>
            <section className={styles.card}>
              <h2>Outlet details</h2>
              <dl className={styles.definitionList}>
                {outlet && Object.entries({
                  Outlet: outlet.id,
                  Brand: label(outlet.brand),
                  Depot: outlet.depot.name,
                  District: outlet.district,
                  "Delivery window": `${outlet.windowOpenTime}-${outlet.windowCloseTime}`,
                  Dock: label(outlet.dockType),
                  Access: label(outlet.parkingConstraint)
                }).map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}
              </dl>
            </section>
            <section className={styles.card}>
              <h2>Account</h2>
              <p>{account?.displayName} · {account?.email} · {account?.locale}</p>
              <Link href="/sign-in/reset">Change password</Link>
            </section>
          </>
        )}
      </section>
    </WorkspaceShell>
  );
}
