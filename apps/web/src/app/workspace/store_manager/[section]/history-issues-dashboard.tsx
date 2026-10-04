"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronRight, CircleX, Package, Search, Truck } from "lucide-react";
import styles from "./section.module.css";

type OrderRow = {
  id: string;
  orderRef: string;
  deliveryRef: string;
  requestedAt: string;
  requestedDate: string;
  deliveryWindow: string;
  type: string;
  units: number;
  status: string;
  statusLabel: string;
};

type IssueRow = {
  id: string;
  orderId: string;
  orderRef: string;
  deliveryRef: string;
  type: string;
  description: string;
  reportedAt: string;
  reportedDate: string;
  reportedTime: string;
  status: string;
  statusLabel: string;
};

function statusClass(status: string) {
  if (status === "DELIVERED" || status === "CONFIRMED" || status === "RESOLVED") return styles.historyStatusSuccess;
  if (status === "SUBMITTED") return styles.historyStatusInfo;
  if (status === "CANCELLED" || status === "REPORTED" || status === "REOPENED") return styles.historyStatusDanger;
  if (status === "OUT_FOR_DELIVERY" || status === "LOADED" || status === "ALLOCATED" || status === "UNDER_REVIEW" || status === "ACKNOWLEDGED") return styles.historyStatusWarning;
  return styles.historyStatusNeutral;
}

function matchesMonth(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function issueTone(type: string) {
  if (type.toLowerCase().includes("damaged")) return styles.issueTypeDanger;
  if (type.toLowerCase().includes("receipt") || type.toLowerCase().includes("loading")) return styles.issueTypeWarning;
  return styles.issueTypeInfo;
}

export function HistoryIssuesDashboard({ orders, issues }: { orders: OrderRow[]; issues: IssueRow[] }) {
  const [query, setQuery] = useState("");
  const [orderType, setOrderType] = useState("all");
  const [orderStatus, setOrderStatus] = useState("all");
  const [orderDate, setOrderDate] = useState("month");
  const [issueStatus, setIssueStatus] = useState("all");
  const [issueDate, setIssueDate] = useState("month");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchesQuery = !normalizedQuery || [order.orderRef, order.deliveryRef, order.statusLabel, order.type].some((value) => value.toLowerCase().includes(normalizedQuery));
    const matchesType = orderType === "all" || order.type.toLowerCase() === orderType;
    const matchesStatus = orderStatus === "all" || order.status === orderStatus;
    const matchesDate = orderDate === "all" || matchesMonth(order.requestedAt);
    return matchesQuery && matchesType && matchesStatus && matchesDate;
  }), [normalizedQuery, orderDate, orderStatus, orderType, orders]);

  const filteredIssues = useMemo(() => issues.filter((issue) => {
    const matchesStatus = issueStatus === "all" || issue.status === issueStatus;
    const matchesDate = issueDate === "all" || matchesMonth(issue.reportedAt);
    return matchesStatus && matchesDate;
  }), [issueDate, issueStatus, issues]);

  return (
    <section className={styles.historyPage}>
      <header className={styles.historyHeading}>
        <h1>History &amp; issues</h1>
        <p>View your past orders, deliveries and any reported issues.</p>
      </header>

      <section className={styles.historySummaryGrid} aria-label="History summary">
        <article><span className={styles.summaryGreen}><Package /></span><div><strong>{orders.length}</strong><p>Total orders</p><small>All time</small></div></article>
        <article><span className={styles.summaryBlue}><Truck /></span><div><strong>{orders.filter((order) => order.status === "DELIVERED").length}</strong><p>Completed deliveries</p><small>Delivered to store</small></div></article>
        <article><span className={styles.summaryAmber}><AlertTriangle /></span><div><strong>{issues.length}</strong><p>Issues reported</p><small>Require attention</small></div></article>
        <article><span className={styles.summaryRed}><CircleX /></span><div><strong>{orders.filter((order) => order.status === "CANCELLED").length}</strong><p>Cancelled orders</p><small>Did not proceed</small></div></article>
      </section>

      <section className={styles.historyCard}>
        <header className={styles.historyCardHeader}>
          <h2>Order history</h2>
        </header>
        <section className={styles.historyFilters} aria-label="Order history filters">
          <label className={styles.historySearch}>
            <Search aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order number, delivery number..." type="search" />
          </label>
          <select value={orderType} onChange={(event) => setOrderType(event.target.value)} aria-label="Filter order type">
            <option value="all">All types</option>
            <option value="ambient">Ambient</option>
            <option value="chilled">Chilled</option>
          </select>
          <select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)} aria-label="Filter order status">
            <option value="all">All statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="OUT_FOR_DELIVERY">In transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select value={orderDate} onChange={(event) => setOrderDate(event.target.value)} aria-label="Filter order date">
            <option value="month">This month</option>
            <option value="all">All dates</option>
          </select>
        </section>
        <div className={styles.historyTableWrap}>
          <div className={styles.orderHistoryHeader}>
            <span>Order / Delivery</span><span>Date &amp; time</span><span>Type</span><span>Units</span><span>Status</span><span>Actions</span>
          </div>
          {filteredOrders.map((order) => (
            <article className={styles.orderHistoryRow} key={order.id}>
              <span className={styles.historyTruckIcon}><Truck /></span>
              <div><strong>{order.orderRef}</strong><small>{order.deliveryRef}</small></div>
              <time>{order.requestedDate}<small>{order.deliveryWindow}</small></time>
              <span>{order.type}</span>
              <span>{order.units}</span>
              <span className={`${styles.historyBadge} ${statusClass(order.status)}`}>{(order.status === "DELIVERED" || order.status === "CONFIRMED") && <Check />}{order.statusLabel}</span>
              <Link className={styles.historyAction} href={`/workspace/store_manager/orders/${order.id}`}>View / manage</Link>
              <ChevronRight className={styles.historyChevron} />
            </article>
          ))}
          {!filteredOrders.length && <p className={styles.historyEmpty}>No orders match the selected filters.</p>}
        </div>
      </section>

      <section className={styles.historyCard}>
        <header className={styles.historyCardHeader}>
          <h2>Issue cases</h2>
          <div className={styles.issueFilters}>
            <select value={issueStatus} onChange={(event) => setIssueStatus(event.target.value)} aria-label="Filter issue status">
              <option value="all">All statuses</option>
              <option value="REPORTED">Open</option>
              <option value="UNDER_REVIEW">Under review</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REOPENED">Reopened</option>
            </select>
            <select value={issueDate} onChange={(event) => setIssueDate(event.target.value)} aria-label="Filter issue date">
              <option value="month">This month</option>
              <option value="all">All dates</option>
            </select>
          </div>
        </header>
        <div className={styles.historyTableWrap}>
          <div className={styles.issueHistoryHeader}>
            <span>Order / Delivery</span><span>Issue type</span><span>Description</span><span>Reported on</span><span>Status</span><span>Actions</span>
          </div>
          {filteredIssues.map((issue) => (
            <article className={styles.issueHistoryRow} key={issue.id}>
              <span className={styles.historyTruckIcon}><Truck /></span>
              <div><strong>{issue.orderRef}</strong><small>{issue.deliveryRef}</small></div>
              <span className={styles.issueType}><i className={issueTone(issue.type)}><AlertTriangle /></i>{issue.type}</span>
              <p>{issue.description}</p>
              <time>{issue.reportedDate}<small>{issue.reportedTime}</small></time>
              <span className={`${styles.historyBadge} ${statusClass(issue.status)}`}>{issue.status === "RESOLVED" && <Check />}{issue.statusLabel}</span>
              <Link className={styles.historyAction} href={`/workspace/store_manager/orders/${issue.orderId}`}>View / manage</Link>
              <ChevronRight className={styles.historyChevron} />
            </article>
          ))}
          {!filteredIssues.length && <p className={styles.historyEmpty}>No issue cases match the selected filters.</p>}
        </div>
      </section>
    </section>
  );
}
