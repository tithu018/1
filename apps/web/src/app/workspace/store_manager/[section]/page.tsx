import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@waypoint/database";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/lib/auth";
import { displayDate, label } from "@/lib/format";
import styles from "./section.module.css";
import { StorePreferences } from "./preferences";
import { NotificationsList } from "./notifications-list";
import { HistoryIssuesDashboard } from "./history-issues-dashboard";
import { OrderStatusDashboard } from "./order-status-dashboard";

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
    session.outletId ? prisma.order.findMany({ where: { outletId: session.outletId }, include: { lines: true, statusEvents: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" } }) : [],
    session.outletId ? prisma.issueCase.findMany({ where: { order: { outletId: session.outletId } }, include: { order: true }, orderBy: { updatedAt: "desc" } }) : [],
    prisma.notification.findMany({ where: { recipientId: session.accountId }, orderBy: { createdAt: "desc" }, take: 30 })
  ]);

  const outlet = account?.outlet;
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
      title: orderId && orderRef ? notificationTitle(item.type, item.title, item.body).replaceAll(orderId, orderRef) : notificationTitle(item.type, item.title, item.body),
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
      <section className={`${styles.page} ${section === "status" ? styles.statusPageShell : ""} ${section === "notifications" ? styles.notificationPageShell : ""} ${section === "history" ? styles.historyPageShell : ""}`}>
        {section !== "notifications" && section !== "history" && section !== "status" && (
          <header className={styles.heading}>
            <h1>{titles[section]}</h1>
            <p>{outlet ? `${outlet.id} · ${label(outlet.brand)}` : "No outlet assigned"}</p>
          </header>
        )}

        {section === "history" && (
          <HistoryIssuesDashboard
            issues={issues.map((issue) => ({
              id: issue.id,
              orderId: issue.orderId,
              orderRef: shortOrderReference(issue.orderId),
              deliveryRef: shortOrderReference(issue.orderId).replace("ORD", "DEL"),
              type: issue.summary.startsWith("Receipt:") ? "Receipt issue" : issue.summary.startsWith("Loading:") ? "Loading issue" : issue.summary.startsWith("Delivery:") ? "Delivery issue" : "Reported issue",
              description: issue.summary,
              reportedAt: issue.createdAt.toISOString(),
              reportedDate: displayDate(issue.createdAt),
              reportedTime: issue.createdAt.toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit" }),
              status: issue.status,
              statusLabel: label(issue.status)
            }))}
            orders={orders.map((order) => ({
              id: order.id,
              orderRef: shortOrderReference(order.id),
              deliveryRef: shortOrderReference(order.id).replace("ORD", "DEL"),
              requestedAt: order.requestedDate.toISOString(),
              requestedDate: displayDate(order.requestedDate),
              deliveryWindow: `${order.deliveryWindowOpen}-${order.deliveryWindowClose}`,
              type: order.temperatureRequired === "REEFER" ? "Chilled" : "Ambient",
              units: order.units,
              status: order.status,
              statusLabel: label(order.status)
            }))}
          />
        )}

        {section === "status" && (
          <OrderStatusDashboard orders={orders.map((order) => ({
            id: order.id,
            orderRef: shortOrderReference(order.id),
            deliveryRef: shortOrderReference(order.id).replace("ORD", "DEL"),
            outletId: order.outletId,
            outletLabel: outlet ? `${outlet.id} · ${label(outlet.brand)}` : order.outletId,
            requestedDate: order.requestedDate.toISOString(),
            requestedDateLabel: displayDate(order.requestedDate),
            deliveryWindow: `${order.deliveryWindowOpen}-${order.deliveryWindowClose}`,
            type: order.temperatureRequired === "REEFER" ? "Chilled" : "Ambient",
            units: order.units,
            status: order.status,
            statusLabel: label(order.status),
            createdAt: order.createdAt.toISOString(),
            statusEvents: order.statusEvents.map((event) => ({ status: event.status, reason: event.reason, createdAt: event.createdAt.toISOString() })),
            lines: order.lines.map((line) => ({ id: line.id, description: line.description, productCode: line.productCode, quantity: line.quantity }))
          }))} />
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
