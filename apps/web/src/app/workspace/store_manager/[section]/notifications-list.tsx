"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Bell, Box, Check, ChevronRight, Inbox, PackageCheck, Truck } from "lucide-react";
import { displayDate } from "@/lib/format";
import styles from "./section.module.css";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  orderId: string | null;
  orderRef: string | null;
  createdAt: string;
  readAt: string | null;
  href: string;
};

type Filter = "all" | "unread" | "orders" | "deliveries" | "issues";

const filters: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "orders", label: "Orders" },
  { key: "deliveries", label: "Deliveries" },
  { key: "issues", label: "Issues" }
];

function category(type: string): Filter {
  if (type === "ORDER" || type === "PLAN") return "orders";
  if (type === "DELIVERY" || type === "LOAD") return "deliveries";
  if (type === "ISSUE") return "issues";
  return "orders";
}

function groupLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return displayDate(date);
}

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString("en-US", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit" });
}

function IconFor({ type }: { type: string }) {
  if (type === "ISSUE") return <AlertTriangle aria-hidden="true" />;
  if (type === "DELIVERY" || type === "LOAD") return <Truck aria-hidden="true" />;
  if (type === "SYSTEM") return <Bell aria-hidden="true" />;
  if (type === "ORDER" || type === "PLAN") return <Check aria-hidden="true" />;
  return <PackageCheck aria-hidden="true" />;
}

export function NotificationsList({ notifications }: { notifications: NotificationRow[] }) {
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const unreadCount = notifications.filter((item) => !item.readAt).length;
  const filtered = useMemo(() => notifications.filter((item) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return !item.readAt;
    return category(item.type) === activeFilter;
  }), [activeFilter, notifications]);
  const groups = useMemo(() => filtered.reduce<Array<{ label: string; rows: NotificationRow[] }>>((result, item) => {
    const label = groupLabel(item.createdAt);
    const existing = result.find((group) => group.label === label);
    if (existing) existing.rows.push(item);
    else result.push({ label, rows: [item] });
    return result;
  }, []), [filtered]);

  return (
    <section className={styles.notificationsPage}>
      <header className={styles.notificationHeading}>
        <div>
          <h1>Notifications</h1>
          <p>Stay updated on your orders, deliveries, receipts and issues.</p>
        </div>
      </header>

      <nav className={styles.notificationFilters} aria-label="Notification filters">
        {filters.map((filter) => (
          <button className={activeFilter === filter.key ? styles.activeFilter : ""} key={filter.key} onClick={() => setActiveFilter(filter.key)} type="button">
            {filter.key === "unread" && unreadCount > 0 && <span className={styles.filterDot} aria-hidden="true" />}
            {filter.key === "orders" && <Box aria-hidden="true" />}
            {filter.key === "deliveries" && <Truck aria-hidden="true" />}
            {filter.key === "issues" && <AlertTriangle aria-hidden="true" />}
            {filter.label}
          </button>
        ))}
      </nav>

      {groups.length ? (
        <div className={styles.notificationGroups}>
          {groups.map((group) => (
            <section className={styles.notificationGroup} key={group.label}>
              <h2>{group.label}</h2>
              <div className={styles.notificationRows}>
                {group.rows.map((item) => (
                  <Link className={`${styles.notificationRow} ${item.readAt ? "" : styles.unreadNotification} ${styles[`notificationType${category(item.type)}`]}`} href={item.href} key={item.id}>
                    <span className={styles.notificationStatusIcon}><IconFor type={item.type} /></span>
                    <span className={styles.notificationReadDot} aria-hidden="true" />
                    <span className={styles.notificationCopy}>
                      <strong>{item.title}</strong>
                      <span>{item.orderRef ? `${item.orderRef} - ${item.message}` : item.message}</span>
                    </span>
                    <time>{group.label === "Today" ? timeLabel(item.createdAt) : group.label === "Yesterday" ? `Yesterday, ${timeLabel(item.createdAt)}` : `${displayDate(item.createdAt)} · ${timeLabel(item.createdAt)}`}</time>
                    <ChevronRight aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className={styles.notificationEmpty}>
          <Inbox aria-hidden="true" />
          <h2>No notifications</h2>
          <p>{activeFilter === "all" ? "Updates about orders, deliveries, receipts and issues will appear here." : "No notifications match this filter."}</p>
          {activeFilter !== "all" && <button onClick={() => setActiveFilter("all")} type="button">Show all</button>}
        </section>
      )}
    </section>
  );
}
