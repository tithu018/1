"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleCheck, Clock3, CloudUpload, MapPin, Navigation, Package, Route, ShieldCheck, Truck, TriangleAlert } from "lucide-react";
import { recordDriverOutcome, startDriverTrip } from "@/lib/workflow-actions";
import { readPending, writePending, type PendingDelivery } from "@/lib/driver-offline";
import { StopMap } from "./stop-map";
import { label } from "@/lib/format";
import ui from "../driver.module.css";
import styles from "./trip.module.css";

type Stop = { address: string | null; latitude: number | null; longitude: number | null; id: string; outletId: string; sequence: number; units: number; window: string; dock: string; access: string; status: string; updatedAt: string; notes: string[] };
export function DriverTrip({ accountId, vehicleId, stops, tripId, tripStatus }: { accountId: string; vehicleId: string | null; stops: Stop[]; tripId: string | null; tripStatus: string }) {
  const [completed, setCompleted] = useState<string[]>(stops.filter((stop) => stop.status === "DELIVERED").map((stop) => stop.id));
  const [reported, setReported] = useState<string[]>([]);
  const [mode, setMode] = useState<"drive" | "stopped" | "navigation" | "problem" | "recorded">("drive");
  const [saving, setSaving] = useState(false), [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState(""), [receiverName, setReceiverName] = useState(""), [note, setNote] = useState("");
  const [started, setStarted] = useState(tripStatus === "OUT_FOR_DELIVERY");
  const [versions, setVersions] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => { const pending = readPending(accountId); setCompleted((current) => [...new Set([...current, ...pending.filter((record) => record.outcome === "DELIVERED").map((record) => record.orderId)])]); }, 0);
    return () => clearTimeout(timer);
  }, [accountId]);
  const stop = stops.find((entry) => !completed.includes(entry.id) && !reported.includes(entry.id));
  const done = stops.filter((entry) => completed.includes(entry.id)).length;
  async function save(outcome: PendingDelivery["outcome"], reason?: string) {
    if (!stop) return;
    if (outcome === "DELIVERED" && !receiverName.trim()) { setError("Enter the receiver's name."); return; }
    if (outcome === "CANNOT_DELIVER" && !(reason ?? note).trim()) { setError("Add a reason for the delivery problem."); return; }
    setSaving(true); setError(null);
    const input: PendingDelivery = { operationId: crypto.randomUUID(), orderId: stop.id, outcome, receiverName, note: reason ?? note, clientUpdatedAt: versions[stop.id] ?? stop.updatedAt };
    try {
      // Keep evidence before sending so a lost response retains the operation ID.
      writePending(accountId, [...readPending(accountId), input]);
      if (!navigator.onLine) setMessage("Saved on this device. Open Sync when you reconnect.");
      else {
        const result = await recordDriverOutcome(input);
        writePending(accountId, readPending(accountId).filter((record) => record.operationId !== input.operationId));
        if (result.status === "CONFLICT") { setMessage("Your saved record needs review in Sync."); setMode("recorded"); return; }
        setMessage(outcome === "DELIVERED" ? "Delivery confirmed by the server." : "The office can review your delivery problem.");
      }
      if (outcome === "DELIVERED") setCompleted((current) => [...current, stop.id]);
      else setReported((current) => [...current, stop.id]);
      setMode("recorded");
    } catch (cause) { setError(`${cause instanceof Error ? cause.message : "Record could not be sent."} Check Sync for any saved record before retrying.`); }
    finally { setSaving(false); }
  }
  async function depart() {
    if (!tripId) return;
    setSaving(true); setError(null);
    try { const records = await startDriverTrip(tripId); setVersions(Object.fromEntries(records.map((record) => [record.orderId, record.updatedAt]))); setStarted(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Departure failed."); }
    finally { setSaving(false); }
  }
  const route = <section className={ui.card}><div className={ui.sectionHeading}><h2><Route />Route overview</h2><span>{stops.length} stops</span></div><ol className={ui.route}>{stops.map((entry) => <li key={entry.id} className={`${ui.stop} ${completed.includes(entry.id) ? ui.done : entry.id === stop?.id ? ui.current : ""}`}><span className={ui.number}>{completed.includes(entry.id) ? <Check /> : entry.sequence}</span><div><strong>{entry.outletId}</strong><p>{entry.address ?? label(entry.dock)}</p><small><Clock3 />{entry.window}</small></div><span>{completed.includes(entry.id) ? "Done" : reported.includes(entry.id) ? "Reported" : `${entry.units} units`}</span></li>)}</ol></section>;
  const heading = <header className={ui.title}><div><span className={ui.eyebrow}>Trip workspace</span><h1>{mode === "navigation" ? "Stop map" : mode === "stopped" ? "At the stop" : mode === "problem" ? "Report a problem" : "Active trip"}</h1></div><span className={ui.tag}><Truck />{started ? "On route" : "Loaded"}</span></header>;
  const alert = error && <p className={ui.error} role="alert">{error}</p>;
  if (!vehicleId || !stops.length) return <div className={ui.page}><header className={ui.title}><h1>Active trip</h1></header><section className={`${ui.card} ${ui.empty}`}><Truck /><h2>No assigned trip</h2><p>Your route appears once loading is confirmed.</p><Link className={ui.secondary} href="/workspace/driver">Back to Today<ArrowRight /></Link></section></div>;
  if (mode === "recorded") return <div className={ui.page}><section className={`${ui.card} ${styles.result}`}><span className={styles.resultIcon}><CircleCheck /></span><span className={ui.eyebrow}>Delivery update</span><h1>Record saved</h1><p>{message}</p><button className={ui.primary} onClick={() => { setMode("drive"); setReceiverName(""); setNote(""); }}>Continue route<ArrowRight /></button><Link className={ui.secondary} href="/workspace/driver/sync"><CloudUpload />Review sync</Link></section></div>;
  if (!stop) return <div className={ui.page}><section className={`${ui.card} ${styles.result}`}><span className={styles.resultIcon}><CircleCheck /></span><h1>{reported.length ? "Route reviewed" : "All stops recorded"}</h1><p>{done} of {stops.length} stops marked delivered{reported.length ? ` · ${reported.length} problems reported` : ""}. Check Sync for server confirmation.</p><Link className={ui.primary} href="/workspace/driver/sync"><CloudUpload />Review delivery records</Link><Link className={ui.secondary} href="/workspace/driver">Back to Today</Link></section>{route}</div>;
  if (!started) return <div className={ui.page}>{heading}<div className={ui.grid}><div className={ui.page}><section className={ui.hero}><div className={ui.heroTop}><span className={ui.eyebrow}>Your vehicle</span><span className={ui.tag}><Check />Loading confirmed</span></div><h2>{vehicleId}</h2><p><Route />{stops.length} stops · {stops.reduce((sum, entry) => sum + entry.units, 0)} units</p><p><MapPin />First stop: {stop.address ?? stop.outletId}</p><button className={ui.primary} disabled={saving} onClick={depart}><Navigation />{saving ? "Starting…" : "Start trip"}</button></section><button className={ui.secondary} onClick={() => setPreview(!preview)}><MapPin />{preview ? "Hide map" : "Preview first stop"}</button>{preview && <section className={ui.card}><StopMap {...stop} /></section>}<p className={ui.notice}><ShieldCheck />Check your vehicle and load before departure.</p>{alert}</div>{route}</div></div>;
  if (mode === "navigation") return <div className={ui.page}>{heading}<section className={ui.card}><div className={ui.sectionHeading}><h2><MapPin />{stop.outletId}</h2><span>Stop {stop.sequence}</span></div><StopMap {...stop} /><p className={ui.notice}><Clock3 />Delivery window {stop.window}</p></section><button className={ui.secondary} onClick={() => setMode("drive")}><ArrowLeft />Back to trip</button></div>;
  if (mode === "problem") return <div className={ui.page}>{heading}<p className={`${ui.notice} ${ui.alert}`}><TriangleAlert />{stop.outletId} · The office will receive your report.</p><section className={ui.card}><div className={styles.problemReasons}>{["Store closed", "Access blocked", "Damaged goods", "Receiver unavailable"].map((reason) => <button disabled={saving} key={reason} onClick={() => save("CANNOT_DELIVER", reason)}><TriangleAlert size={17} />{reason}<ArrowRight size={16} /></button>)}</div><div className={ui.form} style={{ marginTop: 20 }}><label>Other problem<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Describe what happened" maxLength={1000} /></label><button className={ui.primary} disabled={saving || !note.trim()} onClick={() => save("CANNOT_DELIVER")}><CloudUpload />{saving ? "Saving…" : "Send report"}</button></div></section>{alert}<button className={ui.secondary} disabled={saving} onClick={() => setMode("stopped")}><ArrowLeft />Back to stop</button></div>;
  if (mode === "stopped") return <div className={ui.page}>{heading}<div className={ui.grid}><section className={ui.card}><div className={ui.sectionHeading}><h2><MapPin />{stop.outletId}</h2></div><p className={styles.address}>{stop.address}</p><dl className={ui.details}><div><dt><Package />Units</dt><dd>{stop.units}</dd></div><div><dt><Clock3 />Window</dt><dd>{stop.window}</dd></div><div><dt><Truck />Dock</dt><dd>{label(stop.dock)}</dd></div><div><dt><ShieldCheck />Access</dt><dd>{label(stop.access)}</dd></div></dl>{stop.notes.map((message, index) => <p className={`${ui.notice} ${ui.alert}`} key={index}><TriangleAlert />{message}</p>)}</section><section className={ui.card}><div className={ui.sectionHeading}><h2><CircleCheck />Confirm delivery</h2></div><div className={ui.form}><label>Receiver name<input value={receiverName} onChange={(event) => setReceiverName(event.target.value)} autoComplete="off" maxLength={100} placeholder="Who received the delivery?" /></label><label>Delivery note <small>Optional</small><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} placeholder="Add a delivery note" /></label>{alert}<button className={ui.primary} disabled={saving || !receiverName.trim()} onClick={() => save("DELIVERED")}><CircleCheck />{saving ? "Saving…" : "Confirm delivered"}</button><button className={ui.danger} disabled={saving} onClick={() => setMode("problem")}><TriangleAlert />Cannot deliver</button></div></section></div><button className={ui.secondary} disabled={saving} onClick={() => setMode("drive")}><ArrowLeft />Back to route</button></div>;
  return <div className={ui.page}>{heading}<div className={ui.grid}><div className={ui.page}><section className={ui.hero}><div className={ui.heroTop}><span className={ui.eyebrow}>Next stop</span><span className={ui.tag}>Stop {stop.sequence} / {stops.length}</span></div><h2>{stop.address ?? stop.outletId}</h2><p><MapPin />{stop.outletId} · {label(stop.dock)}</p><p><Clock3 />{stop.window}</p><p><Package />{stop.units} units</p><div className={styles.progress}><span style={{ width: `${done / stops.length * 100}%` }} /></div><p>{done} of {stops.length} delivered</p></section><button className={ui.primary} onClick={() => setMode("stopped")}><ShieldCheck />I have stopped safely</button><button className={ui.secondary} onClick={() => setMode("navigation")}><Navigation />View stop map</button><p className={ui.notice}><ShieldCheck />Keep your attention on the road. Use delivery controls when stopped.</p></div>{route}</div></div>;
}
