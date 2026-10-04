"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelStoreOrder, updateStoreOrder } from "../actions";
import styles from "./order-detail.module.css";

type Order = {
  id: string;
  status: string;
  units: number;
  weightKg: number;
  volumeM3: number;
  deliveryWindowOpen: string;
  deliveryWindowClose: string;
  lines: { id: string; description: string; productCode: string; quantity: number }[];
  issues: { id: string; summary: string; status: string }[];
  statusEvents: { status: string; reason: string | null; createdAt: string }[];
};

function shortOrderReference(orderId: string) {
  const raw = orderId.replace(/^ORD-/i, "").replace(/[^a-z0-9]/gi, "");
  const numeric = raw.match(/\d+/g)?.join("") ?? "";
  if (numeric.length >= 4) return `ORD-${numeric.slice(-4)}`;
  const value = raw || orderId;
  const hashed = [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 9000, 0);
  return `ORD-${1000 + hashed}`;
}

export function OrderDetail({ order }: Readonly<{ order: Order }>) {
  const router = useRouter();
  const [lines, setLines] = useState(order.lines);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const orderRef = shortOrderReference(order.id);
  const editable = ["SUBMITTED", "CONFIRMED", "DEFERRED"].includes(currentStatus);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      await updateStoreOrder(order.id, lines.map((line) => ({ lineId: line.id, quantity: line.quantity })));
      setEditing(false);
      setMessage("Order changes saved and sent for revalidation.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Changes could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setMessage(null);
    try {
      await cancelStoreOrder(order.id);
      setCurrentStatus("CANCELLED");
      setEditing(false);
      setMessage("Order cancelled. Its history remains available.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Order could not be cancelled.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>ORDER STATUS</p>
          <h1>{orderRef}</h1>
          <p>Delivery window {order.deliveryWindowOpen}-{order.deliveryWindowClose}</p>
        </div>
        <span className={styles.badge}>{currentStatus.replaceAll("_", " ")}</span>
      </header>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Status timeline</h2>
          <ol className={styles.timeline}>
            {order.statusEvents.map((event) => (
              <li key={`${event.status}-${event.createdAt}`}>
                <strong>{event.status.replaceAll("_", " ")}</strong>
                <span>{event.reason ?? new Date(event.createdAt).toLocaleString("en-GB")}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.card}>
          <h2>{editing ? "Edit order" : "Order summary"}</h2>
          {lines.map((line) => (
            <div className={styles.line} key={line.id}>
              <div>
                <strong>{line.description}</strong>
                <span>{line.productCode}</span>
              </div>
              {editing ? (
                <input
                  min="0"
                  type="number"
                  value={line.quantity}
                  onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, quantity: Number(event.target.value) || 0 } : item))}
                />
              ) : <b>{line.quantity}</b>}
            </div>
          ))}
          <footer className={styles.total}>
            <span>Total units</span>
            <strong>{lines.reduce((sum, line) => sum + line.quantity, 0)}</strong>
          </footer>
          {order.issues.map((issue, index) => (
            <aside className={styles.issue} key={issue.id}>
              <strong>Issue {index + 1} - {issue.status.replaceAll("_", " ")}</strong>
              <span>{issue.summary}</span>
            </aside>
          ))}
        </section>
      </div>

      {message && <p role="status" className={styles.message}>{message}</p>}

      <footer className={styles.actions}>
        {editing ? (
          <>
            <button disabled={busy} onClick={save}>{busy ? "Saving..." : "Save changes"}</button>
            <button className={styles.secondary} disabled={busy} onClick={() => setEditing(false)}>Cancel edit</button>
          </>
        ) : (
          <>
            {editable && <button disabled={busy} onClick={() => setEditing(true)}>Edit order</button>}
            {editable && <button className={styles.danger} disabled={busy} onClick={cancel}>Cancel order</button>}
          </>
        )}
        <Link href="/workspace/store_manager/status">Back to orders</Link>
      </footer>
    </section>
  );
}
