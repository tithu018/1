"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ChevronRight, Clock3, PackageCheck, Search, Truck } from "lucide-react";
import { displayDate } from "@/lib/format";
import styles from "./receipt-confirmation.module.css";
import { recordReceipt } from "./actions";

type DeliveryItem = {
  code: string;
  product: string;
  ordered: number;
  delivered: number;
};

type Delivery = {
  id: string;
  orderRef: string;
  deliveryRef: string;
  requestedDate: string;
  requestedDateLabel: string;
  deliveryWindow: string;
  status: string;
  units: number;
  itemCount: number;
  brand: string;
  type: string;
  driverName: string;
  receiverName: string;
  vehicleId: string;
  deliveredAt: string;
  deliveredAtLabel: string;
  loaderNotes: string[];
  items: DeliveryItem[];
};

type Summary = {
  awaitingReceipt: number;
  receivedThisWeek: number;
  issuesReported: number;
  totalDeliveries: number;
};

function initialReceived(delivery: Delivery) {
  return Object.fromEntries(delivery.items.map((item) => [item.code, item.delivered]));
}

function total(values: Record<string, number>) {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

function isThisWeek(value: string) {
  const date = new Date(value);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);
  return date >= weekStart;
}

export function ReceiptConfirmation({ deliveries, summary }: { deliveries: Delivery[]; summary: Summary }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("week");
  const [selectedId, setSelectedId] = useState(deliveries[0]?.id ?? "");
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [receivedByOrder, setReceivedByOrder] = useState<Record<string, Record<string, number>>>(() => Object.fromEntries(deliveries.map((delivery) => [delivery.id, initialReceived(delivery)])));
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeDeliveries = deliveries.filter((delivery) => !completedIds.includes(delivery.id));
  const filteredDeliveries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return activeDeliveries.filter((delivery) => {
      const matchesQuery = !normalized || [delivery.orderRef, delivery.deliveryRef, delivery.type, delivery.status].some((value) => value.toLowerCase().includes(normalized));
      const matchesStatus = statusFilter === "all" || (statusFilter === "with_notes" ? delivery.loaderNotes.length > 0 : delivery.status.toLowerCase() === statusFilter);
      const matchesDate = dateFilter === "all" || isThisWeek(delivery.requestedDate);
      return matchesQuery && matchesStatus && matchesDate;
    });
  }, [activeDeliveries, dateFilter, query, statusFilter]);

  const selected = activeDeliveries.find((delivery) => delivery.id === selectedId) ?? filteredDeliveries[0] ?? activeDeliveries[0] ?? null;
  const selectedReceived = selected ? receivedByOrder[selected.id] ?? initialReceived(selected) : {};
  const receivedUnits = total(selectedReceived);
  const expectedUnits = selected?.units ?? 0;
  const hasQuantityIssue = Boolean(selected && receivedUnits !== expectedUnits);

  function updateReceived(delivery: Delivery, item: DeliveryItem, value: string) {
    const nextValue = Math.max(0, Math.min(item.delivered, Math.floor(Number(value) || 0)));
    setReceivedByOrder((current) => ({
      ...current,
      [delivery.id]: {
        ...(current[delivery.id] ?? initialReceived(delivery)),
        [item.code]: nextValue
      }
    }));
  }

  function submitReceipt(mode: "confirm" | "issue") {
    if (!selected) return;
    const note = notes[selected.id]?.trim() ?? "";
    if (mode === "issue" && !note) {
      setError("Add a note before reporting an issue.");
      return;
    }

    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const outcome = mode === "issue" || receivedUnits < expectedUnits ? "short" : "full";
        const result = await recordReceipt(selected.id, receivedUnits, expectedUnits, outcome, note);
        setCompletedIds((current) => [...current, selected.id]);
        setMessage(result.issueId ? `${selected.orderRef} receipt recorded and issue reported.` : `${selected.orderRef} receipt confirmed.`);
        const next = activeDeliveries.find((delivery) => delivery.id !== selected.id);
        setSelectedId(next?.id ?? "");
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Receipt could not be recorded.");
      }
    });
  }

  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>Receive delivery</h1>
          <p>Confirm the items and quantities from delivered orders.</p>
        </div>
        {activeDeliveries.length > 1 && <button className={styles.receiveAll} onClick={() => setSelectedId(activeDeliveries[0].id)} type="button"><PackageCheck />Start receiving</button>}
      </header>

      <section className={styles.summaryGrid} aria-label="Delivery receipt summary">
        <article className={styles.summaryWarning}><Truck /><div><strong>{activeDeliveries.length}</strong><span>Awaiting receipt</span></div></article>
        <article className={styles.summarySuccess}><Check /><div><strong>{summary.receivedThisWeek}</strong><span>Received this week</span></div></article>
        <article className={styles.summaryDanger}><AlertTriangle /><div><strong>{summary.issuesReported}</strong><span>Issues reported</span></div></article>
        <article className={styles.summaryInfo}><PackageCheck /><div><strong>{summary.totalDeliveries}</strong><span>Total deliveries</span></div></article>
      </section>

      <div className={styles.layout}>
        <div className={styles.leftColumn}>
          <section className={styles.filters} aria-label="Search and filters">
            <label>
              <Search aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order number, delivery number..." type="search" />
            </label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
              <option value="all">All statuses</option>
              <option value="delivered">Delivered</option>
              <option value="with_notes">With notes</option>
            </select>
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filter by date">
              <option value="week">This week</option>
              <option value="all">All dates</option>
            </select>
          </section>

          <section className={styles.listCard}>
            <header>
              <h2>Deliveries awaiting receipt ({filteredDeliveries.length})</h2>
            </header>
            {filteredDeliveries.length ? (
              <div className={styles.tableWrap}>
                <div className={styles.tableHeader}>
                  <span>Order / Delivery</span>
                  <span>Delivery date &amp; time</span>
                  <span>Items</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>
                {filteredDeliveries.map((delivery) => (
                  <article className={`${styles.deliveryRow} ${selected?.id === delivery.id ? styles.selectedRow : ""}`} key={delivery.id}>
                    <span className={styles.rowIcon}><Truck aria-hidden="true" /></span>
                    <div className={styles.orderCell}>
                      <strong>{delivery.orderRef}</strong>
                      <small>{delivery.deliveryRef}</small>
                    </div>
                    <time>{delivery.requestedDateLabel}<small>{delivery.deliveryWindow}</small></time>
                    <span>{delivery.itemCount} {delivery.itemCount === 1 ? "item" : "items"}</span>
                    <span className={styles.statusBadge}><Check />{delivery.status}</span>
                    <button className={styles.receiveButton} onClick={() => setSelectedId(delivery.id)} type="button">Receive</button>
                    <button className={styles.chevronButton} onClick={() => setSelectedId(delivery.id)} type="button" aria-label={`Open ${delivery.orderRef}`}><ChevronRight /></button>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <PackageCheck />
                <h2>You&apos;re all caught up.</h2>
                <p>Delivered orders requiring confirmation will appear here.</p>
              </div>
            )}
          </section>
        </div>

        <aside className={styles.detailPanel} aria-label="Receive delivery details">
          {selected ? (
            <>
              <header className={styles.panelHeader}>
                <div>
                  <h2>Receive delivery</h2>
                  <p><strong>{selected.orderRef}</strong><span>{selected.deliveryRef}</span></p>
                  <small>{selected.requestedDateLabel} · {selected.deliveryWindow}</small>
                </div>
                <span className={styles.statusBadge}><Check />{selected.status}</span>
              </header>

              <dl className={styles.metaCard}>
                <div><dt>Delivery driver</dt><dd>{selected.driverName}</dd></div>
                <div><dt>Receiver</dt><dd>{selected.receiverName}</dd></div>
                <div><dt>Vehicle number</dt><dd>{selected.vehicleId}</dd></div>
                <div><dt>Delivered</dt><dd>{selected.deliveredAtLabel}</dd></div>
              </dl>

              {selected.loaderNotes.length > 0 && (
                <section className={styles.noteStack}>
                  {selected.loaderNotes.map((note) => <p key={note}><AlertTriangle />{note}</p>)}
                </section>
              )}

              <section className={styles.itemsCard}>
                <h3>Items ({selected.itemCount})</h3>
                <div className={styles.itemHeader}>
                  <span>Product</span><span>Ordered</span><span>Delivered</span><span>Receive</span>
                </div>
                {selected.items.map((item) => (
                  <label className={styles.itemRow} key={item.code}>
                    <span>{item.product}</span>
                    <b>{item.ordered}</b>
                    <b>{item.delivered}</b>
                    <input type="number" min="0" max={item.delivered} step="1" value={selectedReceived[item.code] ?? item.delivered} onChange={(event) => updateReceived(selected, item, event.target.value)} />
                  </label>
                ))}
              </section>

              <label className={styles.notes}>
                Notes <small>(optional)</small>
                <textarea value={notes[selected.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [selected.id]: event.target.value }))} placeholder="Add any notes about this delivery..." maxLength={1000} />
              </label>

              <div className={styles.totals}>
                <span>Ordered {expectedUnits}</span>
                <span>Delivered {expectedUnits}</span>
                <strong className={hasQuantityIssue ? styles.shortTotal : ""}>Receiving {receivedUnits}</strong>
              </div>

              {message && <p className={styles.notice} role="status">{message}</p>}
              {error && <p className={styles.error} role="alert">{error}</p>}

              <div className={styles.panelActions}>
                <button className={styles.issueButton} disabled={isPending} onClick={() => submitReceipt("issue")} type="button"><AlertTriangle />Report issue</button>
                <button className={styles.confirmButton} disabled={isPending || receivedUnits > expectedUnits} onClick={() => submitReceipt("confirm")} type="button"><Check />{isPending ? "Saving..." : "Confirm receipt"}</button>
              </div>
            </>
          ) : (
            <div className={styles.emptyPanel}>
              <Clock3 />
              <h2>No delivery selected</h2>
              <p>Select a delivered order to review receipt details.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
