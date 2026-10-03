"use client";

import Link from "next/link";
import { useState } from "react";
import { displayDate, displayTime } from "@/lib/format";
import styles from "./receipt-confirmation.module.css";
import { recordReceipt } from "./actions";

type Item = { code: string; name: string; expected: number };
export function ReceiptConfirmation({ orderId, expectedUnits, items, brand, loaderNotes }: { orderId: string | null; expectedUnits: number; items: Item[]; brand: string; loaderNotes: string[] }) {
  const [arrivalConfirmed, setArrivalConfirmed] = useState(false);
  const [received, setReceived] = useState<Record<string, number>>(() => Object.fromEntries(items.map((item) => [item.code, item.expected])));
  const [outcome, setOutcome] = useState<"full" | "short" | "reservation">("full");
  const [note, setNote] = useState("");
  const [recorded, setRecorded] = useState<{ issueId: string | null; at: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalReceived = Object.values(received).reduce((sum, value) => sum + value, 0);
  async function submitReceipt() {
    if (!orderId) return;
    setSaving(true); setError(null);
    try { const result = await recordReceipt(orderId, totalReceived, expectedUnits, totalReceived < expectedUnits && outcome === "full" ? "short" : outcome, note); setRecorded({ ...result, at: new Date().toISOString() }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Receipt could not be recorded."); }
    finally { setSaving(false); }
  }
  if (!orderId) return <section className={styles.arrival}><h1>No delivery awaiting receipt</h1><p>Your delivered orders will appear here.</p><Link href="/workspace/store_manager/status">View order status</Link></section>;
  if (recorded) return <section className={styles.success}><h1>Receipt recorded</h1><p>The dispatcher can see your confirmation.</p><dl><div><dt>Order</dt><dd>{orderId}</dd></div><div><dt>Recorded</dt><dd>{displayDate(recorded.at)} · {displayTime(recorded.at)}</dd></div><div><dt>Received</dt><dd>{totalReceived} of {expectedUnits} units</dd></div><div><dt>Issue</dt><dd>{recorded.issueId ?? "None"}</dd></div></dl><Link href="/workspace/store_manager/history">View history &amp; issues</Link></section>;
  if (!arrivalConfirmed) return <section className={styles.arrival}><header><h1>Did the delivery arrive?</h1><p>Step 1 of 2 · {orderId}</p></header><section><h2>Delivery</h2><p>{expectedUnits} units · {items.length} products</p>{loaderNotes.map((message, index) => <p key={index}>Loader note: {message}</p>)}</section><button onClick={() => setArrivalConfirmed(true)}>Confirm arrival</button><Link className={styles.secondary} href="/workspace/store_manager/status">It hasn’t arrived</Link></section>;
  return <section><header className={styles.heading}><h1>Confirm receipt</h1><p>Step 2 of 2 · {orderId} · {totalReceived} of {expectedUnits} units</p></header><section className={styles.choices}><h2>What did you receive?</h2>{(["full", "short", ...(brand === "TECH" ? ["reservation"] : [])] as Array<typeof outcome>).map((choice) => <label key={choice}><input type="radio" checked={outcome === choice} onChange={() => setOutcome(choice)} />{choice === "full" ? "Received in full" : choice === "short" ? "Received short or damaged" : "Accept with reservation — inspection required"}</label>)}</section><section className={styles.table}><h2>Check each product</h2>{items.map((item) => <article key={item.code}><div><strong>{item.name}</strong><span>Expected {item.expected}</span></div><label>Received <input type="number" min="0" max={item.expected} step="1" value={received[item.code]} onChange={(event) => setReceived((current) => ({ ...current, [item.code]: Math.max(0, Math.min(item.expected, Math.floor(Number(event.target.value) || 0))) }))} /></label></article>)}</section><section className={styles.evidence}><h2>Receipt note</h2><textarea value={note} onChange={(event) => setNote(event.target.value)} /></section>{error && <p role="alert">{error}</p>}<button className={styles.primary} disabled={saving} onClick={submitReceipt}>{saving ? "Saving…" : "Confirm receipt"}</button></section>;
}
