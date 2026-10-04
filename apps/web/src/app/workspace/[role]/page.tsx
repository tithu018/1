import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { type UserRole, userRoles } from "@waypoint/domain";
import { prisma } from "@waypoint/database";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/lib/auth";
import { displayDate, displayTime, label } from "@/lib/format";
import { getDriverTrip } from "@/lib/driver-data";
import styles from "./workspace.module.css";

export default async function WorkspacePage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!userRoles.includes(role as UserRole)) notFound();
  const session = await requireRole(role as UserRole);
  if (role === "dispatcher") redirect("/workspace/dispatcher/plan");
  if (role === "loader") redirect("/workspace/loader");
  if (role === "driver") {
    const trip = await getDriverTrip();
    return <WorkspaceShell role="driver" active="Today"><section className={styles.driverToday}><h1>Today</h1><p>{displayDate()}</p>{trip ? <><section className={styles.tripSummary}><header><h2>Trip {trip.tripNumber} · {trip.district}</h2><span>{label(trip.status)}</span></header><dl><div><dt>Vehicle</dt><dd>{trip.vehicleId}</dd></div><div><dt>Departs</dt><dd>{trip.plannedStart ? displayTime(trip.plannedStart) : "Not set"}</dd></div><div><dt>Stops</dt><dd>{trip.allocations.length} · {trip.allocations.reduce((sum, allocation) => sum + allocation.order.units, 0)} units</dd></div><div><dt>Plan</dt><dd>v{trip.plan.version} · {displayDate(trip.plan.serviceDate)}</dd></div></dl></section><ol className={styles.mobileStops}>{trip.allocations.map(({ order, sequence }) => <li key={order.id}><span>{sequence}</span><strong>{order.outletId}</strong><small>Window {order.deliveryWindowOpen}–{order.deliveryWindowClose}</small><b>{label(order.status)}</b></li>)}</ol>{trip.allocations.flatMap(({ order }) => order.loadIssues.map((issue) => <aside className={styles.driverNote} key={issue.id}><b>Loader note · {order.outletId}</b><p>{issue.summary}</p></aside>))}<Link className={styles.startTrip} href="/workspace/driver/trip">Open active trip</Link></> : <p>No loaded trip available for your depot.</p>}<Link href="/workspace/driver/sync">Review sync records</Link></section></WorkspaceShell>;
  }
  const orders = session.outletId ? await prisma.order.findMany({ where: { outletId: session.outletId, status: { not: "CANCELLED" } }, include: { receipt: true }, orderBy: { updatedAt: "desc" } }) : [];
  const issues = session.outletId ? await prisma.issueCase.findMany({ where: { order: { outletId: session.outletId }, status: { not: "RESOLVED" } }, orderBy: { updatedAt: "desc" } }) : [];
  const pendingReceipt = orders.find((order) => order.status === "DELIVERED" && !order.receipt);
  const next = orders.find((order) => !["DELIVERED", "CANCELLED"].includes(order.status));
  return <WorkspaceShell role="store_manager" active="Dashboard"><section className={styles.storePage}>
    <header className={styles.title}><h1>Dashboard</h1><p>{displayDate()}</p></header>
    <div className={styles.storeCards}>
      <article><small>ORDERING</small><strong>16:00 cutoff</strong><span>Place orders for your next delivery run.</span><Link href="/workspace/store_manager/orders">Place order</Link></article>
      <article><small>NEXT ORDER</small><b>{next?.id ?? "No active orders"}</b><span>{next ? `${displayDate(next.requestedDate)} · ${next.deliveryWindowOpen}–${next.deliveryWindowClose}` : "Submitted orders will appear here."}</span>{next && <em>{label(next.status)}</em>}</article>
      <article><small>AWAITING YOUR CONFIRMATION</small><b>{pendingReceipt?.id ?? "No receipts pending"}</b><span>{pendingReceipt ? `${pendingReceipt.units} units expected.` : "Delivered orders awaiting confirmation appear here."}</span><Link href="/workspace/store_manager/receive">Confirm receipt</Link></article>
    </div>
    <section className={styles.attention}><h2>Needs your attention</h2>{orders.filter((order) => order.status === "DEFERRED").map((order) => <article className={styles.alert} key={order.id}><div><strong>{order.id} deferred</strong><p>Review the recorded reason and delivery date.</p></div><Link href={`/workspace/store_manager/orders/${order.id}`}>View order</Link></article>)}{!issues.length && !orders.some((order) => order.status === "DEFERRED") && <p>No outstanding issues or deferred orders.</p>}{issues.map((issue) => <article className={styles.alert} key={issue.id}><div><strong>{issue.summary}</strong><p>{label(issue.status)}</p></div><Link href={`/workspace/store_manager/orders/${issue.orderId}`}>View issue</Link></article>)}</section>
    <div className={styles.lowerGrid}><section><h2>Recent orders</h2>{orders.slice(0, 5).map((order) => <p key={order.id}><Link href={`/workspace/store_manager/orders/${order.id}`}>{order.id}</Link> · {label(order.status)}</p>)}{!orders.length && <p>No orders yet.</p>}</section><section><h2>History &amp; issues</h2><p>{issues.length} open issues</p><Link href="/workspace/store_manager/history">View history</Link><p><Link href="/workspace/store_manager/notifications">View notifications</Link></p></section></div>
  </section></WorkspaceShell>;
}
