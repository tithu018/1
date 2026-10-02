import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@waypoint/database";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/lib/auth";
import styles from "./section.module.css";

const demoHistory = [
  ["ORD0096797", "Wed 25 Mar", "Dry", "45", "Submitted"],
  ["ORD0096654", "Tue 24 Mar", "Chilled", "40", "Deferred"],
  ["ORD0096653", "Tue 24 Mar", "Dry", "44", "Delivered · issue"],
  ["ORD0096518", "Mon 23 Mar", "Chilled", "40", "Deferred"],
  ["ORD0096517", "Mon 23 Mar", "Dry", "56", "Delivered"],
  ["ORD0096380", "Sat 21 Mar", "Dry", "65", "Delivered"],
  ["ORD0096245", "Fri 20 Mar", "Dry", "59", "Delivered"],
  ["ORD0096095", "Thu 19 Mar", "Chilled", "57", "Delivered"],
  ["ORD0096094", "Thu 19 Mar", "Dry", "52", "Delivered"]
] as const;

const settings = [
  ["Outlet", "OUT010 · Fresh"],
  ["Depot", "Peliyagoda"],
  ["District", "Colombo"],
  ["Delivery window", "05:00–07:30"],
  ["Dock type", "Rear dock"],
  ["Parking", "Normal access"]
] as const;

function badgeClass(status: string) {
  if (status.toLowerCase().includes("deferred")) return `${styles.badge} ${styles.warning}`;
  if (status.toLowerCase().includes("delivered") || status.toLowerCase().includes("resolved")) return `${styles.badge} ${styles.success}`;
  return `${styles.badge} ${styles.neutral}`;
}

function StoreStatus() {
  const rows = [
    ["ORD0096797", "Dry", "Wed 25 Mar · 05:00–07:30", "45", "Submitted", "Editable until loading starts", "Edit"],
    ["ORD0096654", "Chilled", "Wed 25 Mar · 05:00–07:30", "40", "Deferred", "Rolled over with priority", "View"],
    ["ORD0096653", "Dry", "Tue 24 Mar · delivered", "44", "Delivered", "Confirm receipt", "View"]
  ];

  return <section className={styles.page}>
    <header className={styles.heading}><h1>Order status</h1><p>Active orders for OUT010</p></header>
    <section className={styles.card}>
      <div className={styles.tableWrap}><table><thead><tr><th>Order</th><th>Type</th><th>Delivery</th><th>Units</th><th>Status</th><th>Next step</th><th /></tr></thead><tbody>
        {rows.map((row) => <tr key={row[0]}><td><strong>{row[0]}</strong></td><td>{row[1]}</td><td>{row[2]}</td><td>{row[3]}</td><td><span className={badgeClass(row[4])}>{row[4] === "Delivered" ? "✓ " : row[4] === "Deferred" ? "△ " : "◷ "}{row[4]}</span></td><td>{row[5]}</td><td><Link href={`/workspace/store_manager/orders/${row[0]}`}>{row[6]}</Link></td></tr>)}
      </tbody></table></div>
      <p className={styles.caption}>Status steps: Submitted → Confirmed → Allocated → Loaded → Out for delivery → Delivered. A deferred order moves to a new date with a reason.</p>
    </section>
  </section>;
}

function StoreHistory() {
  return <section className={styles.page}>
    <header className={styles.heading}><h1>History &amp; issues</h1><p>Orders and issue cases for OUT010</p></header>
    <section className={styles.card}>
      <h2>Issue cases</h2>
      <div className={styles.tableWrap}><table><thead><tr><th>Case</th><th>Order</th><th>Problem</th><th>Status</th><th /></tr></thead><tbody><tr><td><strong>ISS-0417</strong></td><td>ORD0096653</td><td>2 units short (dry)</td><td><span className={badgeClass("Resolved")}>✓ Resolved</span></td><td><Link href="/workspace/store_manager/orders/ORD0096653">Open</Link></td></tr></tbody></table></div>
    </section>
    <section className={styles.card}>
      <div className={styles.cardTitle}><h2>Order history</h2><span className={`${styles.badge} ${styles.warning}`}>△ 2 consecutive chilled deferrals</span></div>
      <div className={styles.tableWrap}><table><thead><tr><th>Order</th><th>Delivery date</th><th>Type</th><th>Units</th><th>Status</th></tr></thead><tbody>
        {demoHistory.map((row) => <tr className={row[4] === "Deferred" ? styles.highlightRow : ""} key={row[0]}><td><strong>{row[0]}</strong></td><td>{row[1]}</td><td>{row[2]}</td><td>{row[3]}</td><td><span className={badgeClass(row[4])}>{row[4].includes("Delivered") ? "✓ " : row[4] === "Deferred" ? "△ " : "◷ "}{row[4]}</span></td></tr>)}
      </tbody></table></div>
    </section>
  </section>;
}

function StoreNotifications({ notifications }: Readonly<{ notifications: Array<{ id: string; title: string; body: string; readAt: Date | null; createdAt: Date }> }>) {
  const fallback = [
    ["Plan v2 published", "Your chilled order ORD0096654 has been deferred to the next delivery day.", "Today · 16:08"],
    ["ORD0096797 submitted", "Your dry order is in the dispatcher planning queue.", "Today · 15:59"],
    ["Issue ISS-0417 resolved", "The short delivery on ORD0096653 has been reviewed and closed.", "Today · 15:52"],
    ["Receipt reminder", "Please confirm what arrived for ORD0096653.", "Today · 15:31"]
  ];
  const rows = notifications.length ? notifications.map((item) => [item.title, item.body, item.createdAt.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" }), item.readAt ? "read" : "unread"]) : fallback.map((item, index) => [...item, index < 2 ? "unread" : "read"]);
  return <section className={styles.page}><header className={styles.heading}><h1>Notifications</h1><p>Updates for OUT010 · Fresh</p></header><section className={`${styles.card} ${styles.notificationList}`}>{rows.map((row, index) => <article className={row[3] === "unread" ? styles.unread : ""} key={`${row[0]}-${index}`}><span className={styles.notificationIcon}>●</span><div><strong>{row[0]}</strong><p>{row[1]}</p><small>{row[2]}</small></div>{row[3] === "unread" && <i aria-label="Unread" />}</article>)}</section></section>;
}

function StoreSettings() {
  return <section className={styles.page}><header className={styles.heading}><h1>Settings</h1><p>Outlet details, delivery preferences and account controls</p></header><div className={styles.settingsGrid}><section className={styles.card}><h2>Outlet details</h2><dl className={styles.definitionList}>{settings.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl></section><section className={styles.card}><h2>Ordering preferences</h2><label className={styles.toggleRow}><span><strong>Cutoff reminders</strong><small>Notify me 30 minutes before the order cutoff.</small></span><input type="checkbox" defaultChecked /></label><label className={styles.toggleRow}><span><strong>Delivery updates</strong><small>Show plan, loading and driver status changes.</small></span><input type="checkbox" defaultChecked /></label><label className={styles.toggleRow}><span><strong>Issue updates</strong><small>Notify me when a reported issue changes.</small></span><input type="checkbox" defaultChecked /></label></section></div><section className={styles.card}><h2>Account</h2><div className={styles.accountRow}><span className={styles.avatar}>SM</span><div><strong>Store Manager</strong><p>store@waypoint.demo · English</p></div><button type="button">Change password</button></div></section></section>;
}

export default async function StoreSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!["status", "history", "notifications", "settings"].includes(section)) notFound();
  const session = await requireRole("store_manager");
  const notifications = await prisma.notification.findMany({ where: { recipientId: session.accountId }, orderBy: { createdAt: "desc" }, take: 30 });

  return <WorkspaceShell role="store_manager" active={section === "status" ? "Order status" : section === "history" ? "History & issues" : section === "notifications" ? "Notifications" : "Settings"}>
    {section === "status" ? <StoreStatus /> : section === "history" ? <StoreHistory /> : section === "notifications" ? <StoreNotifications notifications={notifications} /> : <StoreSettings />}
  </WorkspaceShell>;
}
