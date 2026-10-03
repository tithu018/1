"use client";
import Link from "next/link";
import { useState } from "react";
import { recordDriverOutcome, startDriverTrip } from "@/lib/workflow-actions";
import { readPending, writePending, type PendingDelivery } from "@/lib/driver-offline";
import { label } from "@/lib/format";
import styles from "./trip.module.css";

type Stop = { id: string; outletId: string; sequence: number; units: number; window: string; dock: string; access: string; status: string; updatedAt: string; notes: string[] };
export function DriverTrip({ accountId, vehicleId, stops, tripId, tripStatus }: { accountId: string; vehicleId: string | null; stops: Stop[]; tripId: string | null; tripStatus: string }) {
  const [completed, setCompleted] = useState<string[]>(stops.filter((stop) => stop.status === "DELIVERED").map((stop) => stop.id));
  const [mode, setMode] = useState<"drive" | "stopped" | "navigation" | "problem" | "recorded">("drive");
  const [saving, setSaving] = useState(false), [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState(""), [receiverName, setReceiverName] = useState(""), [note, setNote] = useState("");
  const [started, setStarted] = useState(tripStatus === "OUT_FOR_DELIVERY");
  const [versions, setVersions] = useState<Record<string, string>>({});
  const stop = stops.find((entry) => !completed.includes(entry.id));
  async function save(outcome: PendingDelivery["outcome"], reason?: string) {
    if (!stop) return;
    setSaving(true); setError(null);
    const input: PendingDelivery = { operationId: crypto.randomUUID(), orderId: stop.id, outcome, receiverName, note: reason ?? note, clientUpdatedAt: versions[stop.id] ?? stop.updatedAt };
    if (outcome === "DELIVERED" && !receiverName.trim()) { setError("Enter the receiver's name."); setSaving(false); return; }
    try {
      if (!navigator.onLine) { writePending(accountId, [...readPending(accountId), input]); setMessage("Saved offline — awaiting server acknowledgement"); }
      else { const result = await recordDriverOutcome(input); setMessage(result.status === "CONFLICT" ? "Needs review in Sync" : outcome === "DELIVERED" ? "Delivery recorded" : "Problem recorded"); if (result.status === "CONFLICT") { setMode("recorded"); return; } }
      if (outcome === "DELIVERED") setCompleted((current) => [...current, stop.id]);
      setMode("recorded");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Outcome could not be saved. Retry when connected."); }
    finally { setSaving(false); }
  }
  if (!vehicleId || !stops.length) return <section className={styles.stopCard}><h1>No assigned trip</h1><p>Awaiting loading or assignment.</p></section>;
  if (!started) return <section className={styles.stopCard}><h1>{vehicleId}</h1><p>{stops.length} stops · Loaded</p><ol>{stops.map((entry) => <li key={entry.id}>{entry.outletId} · {entry.window}</li>)}</ol><button className={styles.primary} disabled={saving} onClick={async () => { if (!tripId) return; setSaving(true); setError(null); try { const records = await startDriverTrip(tripId); setVersions(Object.fromEntries(records.map((record) => [record.orderId, record.updatedAt]))); setStarted(true); } catch (cause) { setError(cause instanceof Error ? cause.message : "Departure failed."); } finally { setSaving(false); } }}>{saving ? "Starting…" : "Start trip"}</button>{error && <p role="alert">{error}</p>}</section>;
  if (mode === "recorded") return <section className={styles.recorded}><h1>Outcome saved</h1><p>{message}</p><Link href="/workspace/driver/sync">Review sync records</Link><button className={styles.primary} onClick={() => { setMode("drive"); setReceiverName(""); setNote(""); }}>Continue trip</button></section>;
  if (!stop) return <section className={styles.recorded}><h1>Trip complete</h1><p>{completed.length} delivery stops completed. Review Sync for any pending records.</p><Link href="/workspace/driver/sync">Review Sync</Link></section>;
  if (mode === "navigation") return <section className={styles.stopCard}><h1>Navigation · {stop.outletId}</h1><p>Window {stop.window}. Use your map app with the verified outlet address.</p><p>No route coordinates are registered for this outlet yet.</p><button className={styles.primary} onClick={() => setMode("drive")}>Return to drive mode</button></section>;
  if (mode === "problem") return <section className={styles.problem}><h1>Cannot deliver · {stop.outletId}</h1>{["Store closed", "Access blocked"].map((reason) => <button disabled={saving} key={reason} onClick={() => save("CANNOT_DELIVER", reason)}>{reason}</button>)}{error && <p role="alert">{error}</p>}<button className={styles.secondary} onClick={() => setMode("stopped")}>Back to stop</button></section>;
  if (mode === "stopped") return <section><section className={styles.stopCard}><h1>{stop.outletId}</h1><dl><div><dt>Order</dt><dd>{stop.id} · {stop.units} units</dd></div><div><dt>Window</dt><dd>{stop.window}</dd></div><div><dt>Dock</dt><dd>{label(stop.dock)}</dd></div><div><dt>Access</dt><dd>{label(stop.access)}</dd></div></dl>{stop.notes.map((message, index) => <aside key={index}>{message}</aside>)}<label>Receiver name<input value={receiverName} onChange={(event) => setReceiverName(event.target.value)} /></label><label>Delivery note<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label></section><button className={styles.primary} disabled={saving} onClick={() => save("DELIVERED")}>{saving ? "Saving…" : "Mark delivered"}</button><button className={styles.secondary} onClick={() => setMode("problem")}>Cannot deliver / report a problem</button>{error && <p role="alert">{error}</p>}</section>;
  return <section><section className={styles.driveCard}><small>NEXT STOP · {vehicleId}</small><h1>{stop.outletId}</h1><p>Stop {stop.sequence} of {stops.length} · {label(stop.dock)}</p><strong>Window {stop.window}</strong><p className={styles.progress}>{completed.length} of {stops.length} stops done</p></section><button className={styles.primary} onClick={() => setMode("stopped")}>I have stopped safely</button><button className={styles.secondary} onClick={() => setMode("navigation")}>Open navigation</button><p className={styles.hint}>Delivery details unlock after you have stopped.</p></section>;
}
