"use client";

import { useState } from "react";
import styles from "./load-checklist.module.css";
import { confirmTripLoaded } from "./actions";

type Stop = { orderId: string; outletId: string; units: number; sequence: number };

export function LoadChecklistV2({ trip, vehicleId, stops }: Readonly<{ trip: string | null; vehicleId: string | null; stops: Stop[] }>) {
  const [checked, setChecked] = useState(() => new Set(stops.map((stop) => stop.orderId)));
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function confirm() {
    if (!trip) return;
    setSaving(true); setError(null);
    try { await confirmTripLoaded(trip, [...checked]); setDone(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Loading confirmation failed."); }
    finally { setSaving(false); }
  }
  if (!trip) return <section className={styles.success}><h1>No published trip to load</h1><p>The checklist will appear after the Dispatcher publishes a plan for this depot.</p></section>;
  if (done) return <section className={styles.success}><span className={styles.successIcon}>OK</span><h1>{vehicleId} is loaded</h1><p>The Driver can now see the server-confirmed handoff.</p><dl><div><dt>Trip</dt><dd>{trip}</dd></div><div><dt>Stops confirmed</dt><dd>{checked.size} of {stops.length}</dd></div><div><dt>Status</dt><dd>Loaded</dd></div></dl></section>;
  return <section className={styles.verify}><header className={styles.heading}><h1>Load {vehicleId}</h1><p>Confirm the published trip in reverse delivery order.</p></header><section className={styles.stopList}>{[...stops].sort((a, b) => b.sequence - a.sequence).map((stop) => <article className={styles.stopRow} key={stop.orderId}><button className={`${styles.check} ${checked.has(stop.orderId) ? styles.checked : ""}`} type="button" onClick={() => setChecked((current) => { const next = new Set(current); if (next.has(stop.orderId)) next.delete(stop.orderId); else next.add(stop.orderId); return next; })}>{checked.has(stop.orderId) ? "OK" : ""}</button><strong>{stop.outletId}</strong><span className={styles.order}>{stop.orderId} - {stop.units} units</span></article>)}</section><footer className={styles.actions}><button disabled={saving || checked.size !== stops.length} onClick={confirm}>{saving ? "Saving..." : "Confirm loaded"}</button><strong>{checked.size} / {stops.length} stops</strong>{error && <p role="alert">{error}</p>}</footer></section>;
}