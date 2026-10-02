"use client";

import { freshCatalog } from "@waypoint/domain";
import { useEffect, useMemo, useState } from "react";
import { displayDate, displayTime } from "@/lib/format";
import styles from "./order-form.module.css";
import { submitFreshOrder } from "./actions";

type QuantityByCode = Record<string, number>;

const initialQuantities: QuantityByCode = {};

function formatNumber(value: number, digits = 1) { return value.toLocaleString("en-LK", { maximumFractionDigits: digits, minimumFractionDigits: digits }); }

export function FreshOrderForm({ outletId, deliveryWindow, previousQuantities }: { outletId: string; deliveryWindow: string; previousQuantities: QuantityByCode }) {
  const [quantities, setQuantities] = useState<QuantityByCode>(initialQuantities);
  const [filter, setFilter] = useState<"All" | "Dry" | "Chilled">("All");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<"draft" | "submitted" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ id: string; submittedAt: string; requestedDate: string } | null>(null);
  const [note, setNote] = useState("");
  const draftKey = `waypoint-order-draft-${outletId}`;
  useEffect(() => { const timer = setTimeout(() => { try { const draft = localStorage.getItem(draftKey); if (draft) { const saved = JSON.parse(draft); setQuantities(saved.quantities ?? {}); setNote(saved.note ?? ""); } } catch { /* Keep an empty basket when storage is unavailable. */ } }, 0); return () => clearTimeout(timer); }, [draftKey]);

  const visibleProducts = freshCatalog.filter((product) => (filter === "All" || product.category === filter) && `${product.name} ${product.code}`.toLowerCase().includes(query.toLowerCase()));
  const selected = freshCatalog.filter((product) => (quantities[product.code] ?? 0) > 0);
  const totals = useMemo(() => selected.reduce((sum, product) => {
    const quantity = quantities[product.code];
    return { units: sum.units + quantity, weight: sum.weight + product.unitWeightKg * quantity, volume: sum.volume + product.unitVolumeM3 * quantity };
  }, { units: 0, weight: 0, volume: 0 }), [quantities, selected]);

  function setQuantity(code: string, next: number) {
    setResult(null);
    setQuantities((current) => ({ ...current, [code]: Math.max(0, next) }));
  }

  async function submitOrder() {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const saved = await submitFreshOrder(selected.map((product) => ({ code: product.code, quantity: quantities[product.code] })), note);
      setConfirmation(saved);
      try { localStorage.removeItem(draftKey); } catch { /* Server submission is still confirmed. */ }
      setResult("submitted");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "The order could not be submitted.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result === "submitted") return <section className={styles.success}><span>✓</span><h1>Order submitted</h1><p>Waypoint received your order. The dispatcher will confirm it in the planning queue.</p><dl><div><dt>Order ID</dt><dd>{confirmation?.id}</dd></div><div><dt>Received by server</dt><dd>{confirmation && `${displayDate(confirmation.submittedAt)} · ${displayTime(confirmation.submittedAt)}`}</dd></div><div><dt>Cutoff</dt><dd>16:00 daily cutoff</dd></div><div><dt>Delivery</dt><dd>{confirmation ? displayDate(confirmation.requestedDate) : "Next delivery run"} · {deliveryWindow}</dd></div><div><dt>Status</dt><dd>Submitted</dd></div></dl><button onClick={() => { setResult(null); setQuantities({}); setNote(""); }}>Place another order</button></section>;

  return <section>
    <header className={styles.heading}><div><h1>Place order</h1><p>Delivery window: {deliveryWindow} · Order cutoff 16:00</p></div><span>Order cutoff 16:00</span></header>
    <div className={styles.layout}>
      <section className={styles.catalog}>
        <div className={styles.tools}><input aria-label="Search products" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or code" /><button type="button" disabled={!Object.keys(previousQuantities).length} onClick={() => setQuantities(previousQuantities)}>Repeat last order</button></div>
        <div className={styles.tabs}>{(["All", "Dry", "Chilled"] as const).map((item) => <button key={item} className={item === filter ? styles.selected : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
        <div className={styles.productList}>{visibleProducts.map((product) => { const quantity = quantities[product.code] ?? 0; return <article className={styles.product} key={product.code}><div><h2>{product.name}</h2><p>{product.code} · {product.pack} · {product.unitWeightKg} kg · {product.unitVolumeM3} m³</p><span>{product.category}</span></div><div className={styles.stepper}><button aria-label={`Remove one ${product.name}`} onClick={() => setQuantity(product.code, quantity - 1)}>−</button><output>{quantity}</output><button aria-label={`Add one ${product.name}`} onClick={() => setQuantity(product.code, quantity + 1)}>+</button></div></article>; })}</div>
      </section>
      <aside className={styles.basket}><h2>Basket</h2><p className={styles.delivery}>Delivery {confirmation ? displayDate(confirmation.requestedDate) : "Next delivery run"} · {deliveryWindow}</p><ul>{selected.map((product) => <li key={product.code}><span>{product.name}</span><strong>× {quantities[product.code]}</strong></li>)}</ul><dl><div><dt>Total</dt><dd>{totals.units} units</dd></div><div><dt>Weight</dt><dd>{formatNumber(totals.weight)} kg</dd></div><div><dt>Volume</dt><dd>{formatNumber(totals.volume, 3)} m³</dd></div></dl><label htmlFor="note">Note for the dispatcher (optional)</label><textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. rear gate opens at 05:00" />{submitError && <p className={styles.draftNotice}>{submitError}</p>}<button className={styles.submit} disabled={totals.units === 0 || isSubmitting} onClick={submitOrder}>{isSubmitting ? "Submitting…" : "Submit order"}</button><button className={styles.draft} disabled={totals.units === 0} onClick={() => { try { localStorage.setItem(draftKey, JSON.stringify({ quantities, note })); setResult("draft"); } catch { setSubmitError("Draft could not be saved on this device."); } }}>Save draft</button>{result === "draft" && <p className={styles.draftNotice}>Draft saved on this device. It has not been sent to Waypoint.</p>}</aside>
    </div>
  </section>;
}
