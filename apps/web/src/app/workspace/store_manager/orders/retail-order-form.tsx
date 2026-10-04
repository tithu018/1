"use client";
import { useState } from "react";
import { submitRetailOrder } from "./actions";
import { displayDate } from "@/lib/format";
import styles from "./order-form.module.css";

function shortOrderReference(orderId: string) {
  const raw = orderId.replace(/^ORD-/i, "").replace(/[^a-z0-9]/gi, "");
  const numeric = raw.match(/\d+/g)?.join("") ?? "";
  if (numeric.length >= 4) return `ORD-${numeric.slice(-4)}`;
  const value = raw || orderId;
  const hashed = [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 9000, 0);
  return `ORD-${1000 + hashed}`;
}

export function RetailOrderForm({ brand, deliveryWindow }: { brand: "STYLE" | "TECH"; deliveryWindow: string }) {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return <section><header className={styles.heading}><div><h1>Place {brand === "STYLE" ? "Style" : "Tech"} order</h1><p>Delivery window {deliveryWindow} · Order cutoff 16:00</p></div></header>{result ? <section className={styles.success}><h2>Order submitted</h2><p>{result}</p><button onClick={() => setResult(null)}>Place another order</button></section> : <form className={styles.basket} onSubmit={async (event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setPending(true); setError(null);
    try { const saved = await submitRetailOrder({ code: String(data.get("code")), description: String(data.get("description")), quantity: Number(data.get("quantity")), unitWeightKg: Number(data.get("weight")), unitVolumeM3: Number(data.get("volume")), note: String(data.get("note") ?? "") }); setResult(`${shortOrderReference(saved.id)} · ${displayDate(saved.submittedAt)}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Submission failed."); } finally { setPending(false); }
  }}><p>{brand === "TECH" ? "Record the high-value or fragile item and handling instructions." : "Enter the item for your retail delivery and any mall booking instructions."}</p><label>Item code<input name="code" required /></label><label>Description<input name="description" required /></label><label>Quantity<input name="quantity" type="number" min="1" step="1" required /></label><label>Weight per unit (kg)<input name="weight" type="number" min="0.001" step="0.001" required /></label><label>Volume per unit (m³)<input name="volume" type="number" min="0.001" step="0.001" required /></label><label>Handling / delivery note<textarea name="note" /></label>{error && <p role="alert">{error}</p>}<button className={styles.submit} disabled={pending}>{pending ? "Submitting…" : "Submit order"}</button></form>}</section>;
}
