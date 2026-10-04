"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronRight, Circle, Package, Search, Truck, X } from "lucide-react";
import styles from "./section.module.css";

type OrderLine = { id: string; description: string; productCode: string; quantity: number };
type StatusEvent = { status: string; reason: string | null; createdAt: string };

export type StatusOrder = {
  id: string;
  orderRef: string;
  deliveryRef: string;
  outletId: string;
  outletLabel: string;
  requestedDate: string;
  requestedDateLabel: string;
  deliveryWindow: string;
  type: "Ambient" | "Chilled";
  units: number;
  status: string;
  statusLabel: string;
  createdAt: string;
  statusEvents: StatusEvent[];
  lines: OrderLine[];
};

const tabs = [
  { key: "all", label: "All orders" },
  { key: "active", label: "Active" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "transit", label: "In transit" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "CANCELLED", label: "Cancelled" }
];

const transitStatuses = new Set(["ALLOCATED", "LOADED", "OUT_FOR_DELIVERY"]);
const activeStatuses = new Set(["SUBMITTED", "CONFIRMED", "ALLOCATED", "LOADED", "OUT_FOR_DELIVERY", "DEFERRED"]);
const timelineSteps = ["SUBMITTED", "CONFIRMED", "ALLOCATED", "LOADED", "OUT_FOR_DELIVERY", "DELIVERED"];

function statusDisplay(status: string, fallback: string) {
  if (transitStatuses.has(status)) return "In transit";
  if (status === "CANCELLED") return "Cancelled";
  return fallback;
}

function statusClass(status: string) {
  if (status === "DELIVERED") return styles.statusDelivered;
  if (transitStatuses.has(status)) return styles.statusTransit;
  if (status === "CONFIRMED") return styles.statusConfirmed;
  if (status === "SUBMITTED") return styles.statusSubmittedPill;
  if (status === "CANCELLED") return styles.statusCancelled;
  if (status === "DEFERRED") return styles.statusDeferred;
  return styles.statusNeutralPill;
}

function countFor(orders: StatusOrder[], key: string) {
  if (key === "all") return orders.length;
  if (key === "active") return orders.filter((order) => activeStatuses.has(order.status)).length;
  if (key === "transit") return orders.filter((order) => transitStatuses.has(order.status)).length;
  return orders.filter((order) => order.status === key).length;
}

function formatEventTime(value: string) {
  return new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Colombo", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function eventFor(order: StatusOrder, status: string) {
  return order.statusEvents.find((event) => event.status === status);
}

export function OrderStatusDashboard({ orders }: { orders: StatusOrder[] }) {
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState("all");
  const [selectedId, setSelectedId] = useState(orders[0]?.id ?? "");

  const selected = orders.find((order) => order.id === selectedId) ?? orders[0];
  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    const today = new Date();
    return orders.filter((order) => {
      const matchesTab = tab === "all" || (tab === "active" ? activeStatuses.has(order.status) : tab === "transit" ? transitStatuses.has(order.status) : order.status === tab);
      const matchesQuery = !lower || [order.id, order.orderRef, order.deliveryRef].some((value) => value.toLowerCase().includes(lower));
      const matchesType = type === "all" || order.type === type;
      const matchesStatus = status === "all" || (status === "transit" ? transitStatuses.has(order.status) : order.status === status);
      const requested = new Date(order.requestedDate);
      const matchesPeriod = period === "all" || (requested.getMonth() === today.getMonth() && requested.getFullYear() === today.getFullYear());
      return matchesTab && matchesQuery && matchesType && matchesStatus && matchesPeriod;
    });
  }, [orders, period, query, status, tab, type]);

  const summary = [
    { label: "Active orders", value: countFor(orders, "active"), note: "In progress", icon: Package, className: styles.summaryAmber },
    { label: "Delivered", value: countFor(orders, "DELIVERED"), note: "This month", icon: Check, className: styles.summaryGreen },
    { label: "In transit", value: countFor(orders, "transit"), note: "On the way", icon: Truck, className: styles.summaryBlue },
    { label: "Cancelled", value: countFor(orders, "CANCELLED"), note: "This month", icon: X, className: styles.summaryRed }
  ];

  return (
    <section className={styles.statusPage}>
      <header className={styles.statusHeading}>
        <h1>Order status</h1>
        <p>Track the current status of your orders from dispatch to delivery.</p>
      </header>

      <section className={styles.statusSummaryGrid} aria-label="Order summary">
        {summary.map((item) => {
          const Icon = item.icon;
          return <article key={item.label}><span className={item.className}><Icon aria-hidden="true" /></span><div><strong>{item.value}</strong><p>{item.label}</p><small>{item.note}</small></div></article>;
        })}
      </section>

      <div className={styles.statusLayout}>
        <section className={styles.statusBoard}>
          <nav className={styles.statusTabs} aria-label="Order status tabs">
            {tabs.map((item) => <button className={tab === item.key ? styles.activeStatusTab : ""} key={item.key} onClick={() => setTab(item.key)} type="button">{item.label} ({countFor(orders, item.key)})</button>)}
          </nav>

          <section className={styles.statusFilters} aria-label="Order filters">
            <label className={styles.statusSearch}><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order number, delivery number..." /></label>
            <label><select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter order type"><option value="all">All types</option><option value="Ambient">Ambient</option><option value="Chilled">Chilled</option></select><ChevronDown aria-hidden="true" /></label>
            <label><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter status"><option value="all">All statuses</option><option value="SUBMITTED">Submitted</option><option value="CONFIRMED">Confirmed</option><option value="transit">In transit</option><option value="DELIVERED">Delivered</option><option value="CANCELLED">Cancelled</option><option value="DEFERRED">Deferred</option></select><ChevronDown aria-hidden="true" /></label>
            <label><CalendarDays aria-hidden="true" /><select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Filter period"><option value="all">All dates</option><option value="month">This month</option></select><ChevronDown aria-hidden="true" /></label>
          </section>

          <div className={styles.statusTableWrap}>
            <div className={styles.statusTableHeader}><span>Order / Delivery</span><span>Delivery date & time</span><span>Type</span><span>Units</span><span>Status</span><span>Actions</span><span /></div>
            {filtered.map((order) => (
              <article className={`${styles.statusTableRow} ${selected?.id === order.id ? styles.selectedStatusRow : ""}`} key={order.id}>
                <Truck className={styles.statusRowIcon} aria-hidden="true" />
                <div><button onClick={() => setSelectedId(order.id)} type="button">{order.orderRef}</button><small>{order.deliveryRef}</small></div>
                <time>{order.requestedDateLabel}<small>{order.deliveryWindow}</small></time>
                <span data-label="Type">{order.type}</span>
                <span data-label="Units">{order.units}</span>
                <span className={`${styles.orderStatusBadge} ${statusClass(order.status)}`}>{statusDisplay(order.status, order.statusLabel)}</span>
                <Link className={styles.statusAction} href={`/workspace/store_manager/orders/${order.id}`}>View / manage</Link>
                <button className={styles.statusChevron} onClick={() => setSelectedId(order.id)} type="button" aria-label={`Show ${order.orderRef}`}><ChevronRight aria-hidden="true" /></button>
              </article>
            ))}
            {!filtered.length && <p className={styles.statusEmpty}>No orders match these filters.</p>}
          </div>

          <footer className={styles.statusPager}>
            <span>Showing {filtered.length ? `1-${filtered.length}` : "0"} of {orders.length} orders</span>
            <div><button type="button" aria-label="Previous page" disabled>{"<"}</button><button className={styles.currentPage} type="button">1</button></div>
          </footer>
        </section>

        {selected && (
          <aside className={styles.orderDetailsPanel} aria-label="Order details">
            <header><h2>Order details</h2><button onClick={() => setSelectedId("")} type="button" aria-label="Close order details"><X aria-hidden="true" /></button></header>
            <section className={styles.detailHero}><Truck aria-hidden="true" /><div><strong>{selected.orderRef}</strong><span>{selected.deliveryRef}</span><small>{selected.requestedDateLabel} · {selected.deliveryWindow}</small></div><span className={`${styles.orderStatusBadge} ${statusClass(selected.status)}`}>{statusDisplay(selected.status, selected.statusLabel)}</span></section>
            <dl className={styles.detailDefinition}><div><dt>Outlet</dt><dd>{selected.outletLabel}</dd></div><div><dt>Type</dt><dd>{selected.type}</dd></div><div><dt>Units</dt><dd>{selected.units}</dd></div><div><dt>Order date</dt><dd>{formatEventTime(selected.createdAt)}</dd></div><div><dt>Delivery date</dt><dd>{selected.requestedDateLabel}<br />{selected.deliveryWindow}</dd></div></dl>
            <section className={styles.currentStatus}><h3>Current status</h3><ol>{timelineSteps.map((step) => { const event = eventFor(selected, step); const complete = Boolean(event); const current = selected.status === step || (transitStatuses.has(selected.status) && step === "OUT_FOR_DELIVERY"); return <li className={`${complete ? styles.completeStep : ""} ${current ? styles.currentStep : ""}`} key={step}><span>{complete ? <Check aria-hidden="true" /> : current ? <Circle aria-hidden="true" /> : null}</span><div><strong>{step === "OUT_FOR_DELIVERY" ? "Out for delivery" : step === "ALLOCATED" || step === "LOADED" ? "In transit" : step.toLowerCase().replaceAll("_", " ")}</strong><small>{event ? formatEventTime(event.createdAt) : "Pending"}</small></div></li>; })}</ol></section>
            <section className={styles.detailItems}><header><h3>Items ({selected.lines.length})</h3><Link href={`/workspace/store_manager/orders/${selected.id}`}>View all</Link></header><div><span>Product</span><span>Units</span><span>Status</span></div>{selected.lines.slice(0, 4).map((line) => <article key={line.id}><strong>{line.description}</strong><span>{line.quantity}</span><em>Packed</em></article>)}</section>
            <Link className={styles.fullDetailsButton} href={`/workspace/store_manager/orders/${selected.id}`}>View full order details</Link>
          </aside>
        )}
      </div>
    </section>
  );
}
