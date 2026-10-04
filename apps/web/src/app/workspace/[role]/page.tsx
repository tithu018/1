import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Bell, Box, Check, ChevronRight, Clock3, Snowflake, TriangleAlert } from "lucide-react";
import { type UserRole, userRoles } from "@waypoint/domain";
import { prisma } from "@waypoint/database";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/lib/auth";
import { displayDate, displayTime, label } from "@/lib/format";
import { getDriverTrip } from "@/lib/driver-data";
import styles from "./workspace.module.css";

function displayOrderReference(orderId: string) {
  const value = orderId.replace(/^ORD-/i, "").replaceAll("-", "");
  const numeric = [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 9000, 0);
  return `ORD-${1000 + numeric}`;
}

function orderStatusClass(status: string) {
  if (status === "SUBMITTED") return styles.statusSubmitted;
  if (status === "DELIVERED" || status === "CONFIRMED" || status === "LOADED") return styles.statusSuccess;
  if (status === "DEFERRED" || status === "CANCELLED") return styles.statusReview;
  return styles.statusNeutral;
}

function issueStatusClass(status: string) {
  if (status === "RESOLVED") return styles.statusSuccess;
  if (status === "UNDER_REVIEW" || status === "REOPENED") return styles.statusReview;
  return styles.statusReported;
}

function issueIconClass(status: string) {
  if (status === "RESOLVED") return styles.issueIconNeutral;
  if (status === "UNDER_REVIEW" || status === "REOPENED") return styles.issueIconReview;
  return styles.issueIconReported;
}

export default async function WorkspacePage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!userRoles.includes(role as UserRole)) notFound();

  const session = await requireRole(role as UserRole);
  if (role === "dispatcher") redirect("/workspace/dispatcher/plan");
  if (role === "loader") redirect("/workspace/loader");

  if (role === "driver") {
    const trip = await getDriverTrip();
    return (
      <WorkspaceShell role="driver" active="Today">
        <section className={styles.driverToday}>
          <h1>Today</h1>
          <p>{displayDate()}</p>
          {trip ? (
            <>
              <section className={styles.tripSummary}>
                <header>
                  <h2>Trip {trip.tripNumber} · {trip.district}</h2>
                  <span>{label(trip.status)}</span>
                </header>
                <dl>
                  <div><dt>Vehicle</dt><dd>{trip.vehicleId}</dd></div>
                  <div><dt>Departs</dt><dd>{trip.plannedStart ? displayTime(trip.plannedStart) : "Not set"}</dd></div>
                  <div><dt>Stops</dt><dd>{trip.allocations.length} · {trip.allocations.reduce((sum, allocation) => sum + allocation.order.units, 0)} units</dd></div>
                  <div><dt>Plan</dt><dd>v{trip.plan.version} · {displayDate(trip.plan.serviceDate)}</dd></div>
                </dl>
              </section>
              <ol className={styles.mobileStops}>
                {trip.allocations.map(({ order, sequence }) => (
                  <li key={order.id}>
                    <span>{sequence}</span>
                    <strong>{order.outletId}</strong>
                    <small>Window {order.deliveryWindowOpen}–{order.deliveryWindowClose}</small>
                    <b>{label(order.status)}</b>
                  </li>
                ))}
              </ol>
              {trip.allocations.flatMap(({ order }) => order.loadIssues.map((issue) => (
                <aside className={styles.driverNote} key={issue.id}>
                  <b>Loader note · {order.outletId}</b>
                  <p>{issue.summary}</p>
                </aside>
              )))}
              <Link className={styles.startTrip} href="/workspace/driver/trip">Open active trip</Link>
            </>
          ) : <p>No loaded trip available for your depot.</p>}
          <Link href="/workspace/driver/sync">Review sync records</Link>
        </section>
      </WorkspaceShell>
    );
  }

  const orders = session.outletId
    ? await prisma.order.findMany({ where: { outletId: session.outletId, status: { not: "CANCELLED" } }, include: { receipt: true }, orderBy: { updatedAt: "desc" } })
    : [];
  const issues = session.outletId
    ? await prisma.issueCase.findMany({ where: { order: { outletId: session.outletId } }, orderBy: { updatedAt: "desc" } })
    : [];
  const pendingReceipt = orders.find((order) => order.status === "DELIVERED" && !order.receipt);
  const next = orders.find((order) => !["DELIVERED", "CANCELLED"].includes(order.status));
  const deferredOrders = orders.filter((order) => order.status === "DEFERRED");
  const activeIssues = issues.filter((issue) => issue.status !== "RESOLVED");
  const attentionCount = deferredOrders.length + activeIssues.length;

  return (
    <WorkspaceShell role="store_manager" active="Dashboard">
      <section className={styles.storePage}>
        <header className={styles.title}>
          <h1>Dashboard</h1>
          <p>{displayDate()}</p>
        </header>

        <div className={styles.storeCards}>
          <article>
            <small>ORDERING</small>
            <strong>16:00 cutoff</strong>
            <span>Place orders for your next delivery run.</span>
            <Link href="/workspace/store_manager/orders">Place order</Link>
          </article>
          <article>
            <small>NEXT ORDER</small>
            <b>{next?.id ?? "No active orders"}</b>
            <span>{next ? `${displayDate(next.requestedDate)} · ${next.deliveryWindowOpen}–${next.deliveryWindowClose}` : "Submitted orders will appear here."}</span>
            {next && <em>{label(next.status)}</em>}
          </article>
          <article>
            <small>AWAITING YOUR CONFIRMATION</small>
            <b>{pendingReceipt?.id ?? "No receipts pending"}</b>
            <span>{pendingReceipt ? `${pendingReceipt.units} units expected.` : "Delivered orders awaiting confirmation appear here."}</span>
            <Link href="/workspace/store_manager/receive">Confirm receipt</Link>
          </article>
        </div>

        <section className={styles.attentionPanel}>
          <header className={styles.panelHeader}>
            <div>
              <h2>Needs your attention</h2>
              <p>Action required items are shown here.</p>
            </div>
            {attentionCount > 0 && (
              <span className={styles.attentionPill}>
                <Bell aria-hidden="true" />
                {attentionCount} {attentionCount === 1 ? "item needs" : "items need"} attention
              </span>
            )}
          </header>
          <div className={styles.attentionRows}>
            {attentionCount === 0 && (
              <article className={styles.attentionItem}>
                <span className={`${styles.attentionIcon} ${styles.issueIconNeutral}`}><Check aria-hidden="true" /></span>
                <div className={styles.attentionBody}>
                  <small>ALL CLEAR</small>
                  <strong>You&apos;re all caught up.</strong>
                  <p>No outstanding issues or deferred orders.</p>
                </div>
              </article>
            )}
            {deferredOrders.map((order) => (
              <article className={styles.attentionItem} key={order.id}>
                <span className={`${styles.attentionIcon} ${styles.issueIconReview}`}><TriangleAlert aria-hidden="true" /></span>
                <div className={styles.attentionBody}>
                  <small>DEFERRED ORDER</small>
                  <strong>{displayOrderReference(order.id)} requires review</strong>
                  <p>Review the recorded reason and delivery date.</p>
                  <span className={styles.metaLine}><Clock3 aria-hidden="true" />Updated on {displayDate(order.updatedAt)} · {displayTime(order.updatedAt)}</span>
                </div>
                <span className={`${styles.statusBadge} ${styles.statusReview}`}>{label(order.status)}</span>
                <div className={styles.attentionActions}>
                  <Link className={styles.secondaryButton} href={`/workspace/store_manager/orders/${order.id}`}>View details</Link>
                  <Link className={styles.primaryButton} href={`/workspace/store_manager/orders/${order.id}`}>View order<ArrowRight aria-hidden="true" /></Link>
                </div>
              </article>
            ))}
            {activeIssues.map((issue) => (
              <article className={styles.attentionItem} key={issue.id}>
                <span className={`${styles.attentionIcon} ${issueIconClass(issue.status)}`}><TriangleAlert aria-hidden="true" /></span>
                <div className={styles.attentionBody}>
                  <small>{label(issue.status).toUpperCase()}</small>
                  <strong>{displayOrderReference(issue.orderId)}: {issue.summary}</strong>
                  <p>Review the issue status and recorded notes.</p>
                  <span className={styles.metaLine}><Clock3 aria-hidden="true" />Reported on {displayDate(issue.createdAt)} · {displayTime(issue.createdAt)}</span>
                </div>
                <span className={`${styles.statusBadge} ${issueStatusClass(issue.status)}`}>{label(issue.status)}</span>
                <div className={styles.attentionActions}>
                  <Link className={styles.secondaryButton} href={`/workspace/store_manager/orders/${issue.orderId}`}>View details</Link>
                  <Link className={styles.primaryButton} href={`/workspace/store_manager/orders/${issue.orderId}`}>View issue<ArrowRight aria-hidden="true" /></Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className={styles.lowerGrid}>
          <section className={styles.dataCard}>
            <header className={styles.sectionHeader}>
              <div>
                <h2>Recent orders</h2>
                <p>Your latest orders and their current status.</p>
              </div>
              <Link className={styles.secondaryButton} href="/workspace/store_manager/status">View all orders<ArrowRight aria-hidden="true" /></Link>
            </header>
            <div className={styles.orderRows}>
              {orders.slice(0, 5).map((order) => (
                <article className={styles.orderRow} key={order.id}>
                  <strong>{displayOrderReference(order.id)}</strong>
                  <span className={styles.orderType}>
                    {order.temperatureRequired === "REEFER" ? <Snowflake aria-hidden="true" className={styles.chilledIcon} /> : <Box aria-hidden="true" className={styles.ambientIcon} />}
                    {order.temperatureRequired === "REEFER" ? "Chilled" : "Ambient"}
                  </span>
                  <time>{displayDate(order.requestedDate)}</time>
                  <span className={`${styles.statusBadge} ${orderStatusClass(order.status)}`}>
                    {["DELIVERED", "CONFIRMED", "LOADED"].includes(order.status) && <Check aria-hidden="true" />}
                    {order.status === "SUBMITTED" && <Clock3 aria-hidden="true" />}
                    {label(order.status)}
                  </span>
                  <Link className={styles.rowArrow} href={`/workspace/store_manager/orders/${order.id}`} aria-label={`View ${displayOrderReference(order.id)}`}><ChevronRight aria-hidden="true" /></Link>
                </article>
              ))}
              {!orders.length && <p className={styles.emptyState}>No orders yet.</p>}
            </div>
          </section>

          <section className={styles.dataCard}>
            <header className={styles.sectionHeader}>
              <div>
                <h2>Issues</h2>
                <p>Recent issues and their status.</p>
              </div>
              <Link className={styles.secondaryButton} href="/workspace/store_manager/history">View all issues<ArrowRight aria-hidden="true" /></Link>
            </header>
            <div className={styles.issueRows}>
              {issues.slice(0, 3).map((issue) => (
                <article className={styles.issueRow} key={issue.id}>
                  <span className={`${styles.issueIcon} ${issueIconClass(issue.status)}`}><TriangleAlert aria-hidden="true" /></span>
                  <div>
                    <strong>{displayOrderReference(issue.orderId)}</strong>
                    <p>{issue.summary}</p>
                    <span className={styles.metaLine}><Clock3 aria-hidden="true" />{displayDate(issue.createdAt)} · {displayTime(issue.createdAt)}</span>
                  </div>
                  <span className={`${styles.statusBadge} ${issueStatusClass(issue.status)}`}>{label(issue.status)}</span>
                  <Link className={styles.rowArrow} href={`/workspace/store_manager/orders/${issue.orderId}`} aria-label={`View issue for ${displayOrderReference(issue.orderId)}`}><ChevronRight aria-hidden="true" /></Link>
                </article>
              ))}
              {!issues.length && <p className={styles.emptyState}>No issue cases.</p>}
            </div>
          </section>
        </div>
      </section>
    </WorkspaceShell>
  );
}
