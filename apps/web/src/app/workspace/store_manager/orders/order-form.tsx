"use client";

import { freshCatalog } from "@waypoint/domain";
import { useMemo, useState } from "react";
import styles from "./order-form.module.css";

type QuantityByCode = Record<string, number>;

const initialQuantities: QuantityByCode = { "FR-D01": 5, "FR-D02": 4, "FR-D03": 3, "FR-D04": 3, "FR-D07": 9, "FR-D08": 10 };

function formatNumber(value: number, digits = 1) { return value.toLocaleString("en-LK", { maximumFractionDigits: digits, minimumFractionDigits: digits }); }

export function FreshOrderForm() {
  const [quantities, setQuantities] = useState<QuantityByCode>(initialQuantities);
  const [filter, setFilter] = useState<"All" | "Dry" | "Chilled">("All");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<"draft" | "submitted" | null>(null);

  const visibleProducts = freshCatalog.filter((product) => (filter === "All" || product.category === filter) && product.name.toLowerCase().includes(query.toLowerCase()));
  const selected = freshCatalog.filter((product) => (quantities[product.code] ?? 0) > 0);
  const totals = useMemo(() => selected.reduce((sum, product) => {
    const quantity = quantities[product.code];
    return { units: sum.units + quantity, weight: sum.weight + product.unitWeightKg * quantity, volume: sum.volume + product.unitVolumeM3 * quantity };
  }, { units: 0, weight: 0, volume: 0 }), [quantities, selected]);

  function setQuantity(code: string, next: number) {
    setResult(null);
    setQuantities((current) => ({ ...current, [code]: Math.max(0, next) }));
  }

  if (result === "submitted") return <section className={styles.success}><span>✓</span><h1>Order submitted</h1><p>Waypoint received your order. The dispatcher will confirm it in the planning queue.</p><dl><div><dt>Order ID</dt><dd>ORD0096797</dd></div><div><dt>Received by server</dt><dd>Tue 24 Mar 2026 · 15:59</dd></div><div><dt>Cutoff</dt><dd>Before 16:00</dd></div><div><dt>Delivery</dt><dd>Wed 25 Mar · 05:00–07:30</dd></div><div><dt>Status</dt><dd>Submitted</dd></div></dl><button onClick={() => setResult(null)}>Place another order</button></section>;

  return <section>
    <header className={styles.heading}><div><h1>Place order</h1><p>Delivery date: Wed 25 Mar 2026 · Order cutoff 16:00</p></div><span>Cutoff 16:00 · 20 min left</span></header>
    <div className={styles.layout}>
      <section className={styles.catalog}>
        <div className={styles.tools}><input aria-label="Search products" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or code" /><button type="button" onClick={() => setQuantities(initialQuantities)}>Repeat last order</button></div>
        <div className={styles.tabs}>{(["All", "Dry", "Chilled"] as const).map((item) => <button key={item} className={item === filter ? styles.selected : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
        <div className={styles.productList}>{visibleProducts.map((product) => { const quantity = quantities[product.code] ?? 0; return <article className={styles.product} key={product.code}><div><h2>{product.name}</h2><p>{product.code} · {product.pack} · {product.unitWeightKg} kg · {product.unitVolumeM3} m³</p><span>{product.category}</span></div><div className={styles.stepper}><button aria-label={`Remove one ${product.name}`} onClick={() => setQuantity(product.code, quantity - 1)}>−</button><output>{quantity}</output><button aria-label={`Add one ${product.name}`} onClick={() => setQuantity(product.code, quantity + 1)}>+</button></div></article>; })}</div>
      </section>
      <aside className={styles.basket}><h2>Basket</h2><p className={styles.delivery}>Delivery Wed 25 Mar · 05:00–07:30</p><ul>{selected.map((product) => <li key={product.code}><span>{product.name}</span><strong>× {quantities[product.code]}</strong></li>)}</ul><dl><div><dt>Total</dt><dd>{totals.units} units</dd></div><div><dt>Weight</dt><dd>{formatNumber(totals.weight)} kg</dd></div><div><dt>Volume</dt><dd>{formatNumber(totals.volume, 3)} m³</dd></div></dl><label htmlFor="note">Note for the dispatcher (optional)</label><textarea id="note" placeholder="e.g. rear gate opens at 05:00" /><button className={styles.submit} disabled={totals.units === 0} onClick={() => setResult("submitted")}>Submit order</button><button className={styles.draft} disabled={totals.units === 0} onClick={() => setResult("draft")}>Save draft</button>{result === "draft" && <p className={styles.draftNotice}>Draft saved on this device. It has not been sent to Waypoint.</p>}<aside className={styles.payday}>Wed 25 Mar is a payday. Consider payday demand when setting quantities.</aside></aside>
    </div>
  </section>;
}
