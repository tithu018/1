"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { confirmTripLoaded, reportLoaderIssue, setLoadLineState, startLoading, withdrawLoaderIssue, type LoaderIssueInput } from "./actions";
import styles from "./load-checklist.module.css";

type Line = { lineKey: string; orderId: string; orderLineId: string | null; description: string; productCode: string; plannedQuantity: number };
type Flag = { id: string; issueId: string | null; lineKey: string; type: "MISSING" | "DAMAGED"; quantity: number; summary: string; note: string | null; photoName: string | null; withdrawnAt: string | null };
type Stop = { sequence: number; orderId: string; outletId: string; brand: string; dockType: string; units: number; weightKg: number; volumeM3: number; lines: Line[] };
type Trip = {
  id: string;
  planId: string;
  planVersion: number;
  tripNumber: number;
  brand: string;
  district: string;
  status: string;
  plannedStart: string | null;
  vehicle: { id: string; type: string; temperature: string; weightCapacityKg: number; volumeCapacityM3: number };
  session: { status: string; startedAt: string; confirmedAt: string | null; reeferTemperatureC: number | null; lines: Array<{ lineKey: string; loadedQuantity: number; plannedQuantity: number }> } | null;
  flags: Flag[];
  stops: Stop[];
};
type PendingTick = { lineKey: string; loaded: boolean };

function time(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Colombo" }).format(new Date(value)) : "Not set";
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" }).format(new Date(value));
}

async function photoPayload(file: File | null): Promise<LoaderIssueInput["photo"]> {
  if (!file) return null;
  if (file.size > 700_000) throw new Error("Photo evidence must be smaller than 700 KB.");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Photo could not be read."));
    reader.readAsDataURL(file);
  });
  return { name: file.name, mimeType: file.type, base64: dataUrl.slice(dataUrl.indexOf(",") + 1) };
}

export function LoadChecklistV2({ trip }: Readonly<{ trip: Trip | null }>) {
  if (!trip) return <section className={styles.empty}><span>○</span><h1>No published trip to load</h1><p>The checklist appears after the Dispatcher publishes a plan for this depot.</p><Link href="/workspace/loader">Return to trip queue</Link></section>;
  return <LoadWorkflow trip={trip} />;
}

function LoadWorkflow({ trip }: Readonly<{ trip: Trip }>) {
  const allLines = trip.stops.flatMap((stop) => stop.lines);
  const storageKey = `waypoint-loader-${trip.id}-v${trip.planVersion}`;
  const initialQuantities = Object.fromEntries(allLines.map((line) => [line.lineKey, trip.session?.lines.find((saved) => saved.lineKey === line.lineKey)?.loadedQuantity ?? 0]));
  const [phase, setPhase] = useState<"readiness" | "checklist" | "review" | "success">(() => trip.status === "LOADED" ? "success" : trip.session ? "checklist" : "readiness");
  const [quantities, setQuantities] = useState<Record<string, number>>(initialQuantities);
  const [flags, setFlags] = useState<Flag[]>(trip.flags);
  const [pending, setPending] = useState<PendingTick[]>([]);
  const [online, setOnline] = useState(true);
  const [orderConfirmed, setOrderConfirmed] = useState(Boolean(trip.session));
  const [reeferConfirmed, setReeferConfirmed] = useState(Boolean(trip.session?.reeferTemperatureC !== null && trip.session));
  const [reeferReading, setReeferReading] = useState(trip.session?.reeferTemperatureC?.toString() ?? "");
  const [activeLine, setActiveLine] = useState<Line | null>(null);
  const [issueType, setIssueType] = useState<"MISSING" | "DAMAGED">("MISSING");
  const [issueQuantity, setIssueQuantity] = useState(1);
  const [issueNote, setIssueNote] = useState("");
  const [issuePhoto, setIssuePhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ confirmedAt: string; plannedUnits: number; loadedUnits: number; flags: number } | null>(() => trip.session?.confirmedAt ? { confirmedAt: trip.session.confirmedAt, plannedUnits: allLines.reduce((sum, line) => sum + line.plannedQuantity, 0), loadedUnits: Object.values(initialQuantities).reduce((sum, value) => sum + value, 0), flags: trip.flags.filter((flag) => !flag.withdrawnAt).length } : null);

  useEffect(() => {
    const updateConnection = () => setOnline(navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    const recoveryTimer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as { quantities?: Record<string, number>; pending?: PendingTick[] } | null;
        if (saved?.quantities) setQuantities((current) => ({ ...current, ...saved.quantities }));
        if (saved?.pending) setPending(saved.pending);
      } catch { /* Use the server snapshot if local recovery data is invalid. */ }
    }, 0);
    return () => { window.clearTimeout(recoveryTimer); window.removeEventListener("online", updateConnection); window.removeEventListener("offline", updateConnection); };
  }, [storageKey]);

  const activeFlags = flags.filter((flag) => !flag.withdrawnAt);
  const flagFor = (lineKey: string) => activeFlags.find((flag) => flag.lineKey === lineKey);
  const plannedUnits = allLines.reduce((sum, line) => sum + line.plannedQuantity, 0);
  const loadedUnits = allLines.reduce((sum, line) => sum + (quantities[line.lineKey] ?? 0), 0);
  const accountedLines = allLines.filter((line) => (quantities[line.lineKey] ?? 0) + (flagFor(line.lineKey)?.quantity ?? 0) === line.plannedQuantity).length;
  const canReview = accountedLines === allLines.length && allLines.length > 0 && pending.length === 0;

  function saveLocal(nextQuantities: Record<string, number>, nextPending: PendingTick[]) {
    try { localStorage.setItem(storageKey, JSON.stringify({ quantities: nextQuantities, pending: nextPending, savedAt: new Date().toISOString() })); } catch { /* Server persistence still protects synchronized ticks. */ }
  }

  async function toggleLine(line: Line) {
    if (flagFor(line.lineKey)) return setMessage("Withdraw this line's flag before changing its loaded state.");
    const loaded = quantities[line.lineKey] !== line.plannedQuantity;
    const nextQuantities = { ...quantities, [line.lineKey]: loaded ? line.plannedQuantity : 0 };
    setQuantities(nextQuantities); setMessage(null);
    const nextPending = [...pending.filter((entry) => entry.lineKey !== line.lineKey), { lineKey: line.lineKey, loaded }];
    if (!navigator.onLine) { setPending(nextPending); saveLocal(nextQuantities, nextPending); return; }
    try {
      await setLoadLineState({ tripId: trip.id, planVersion: trip.planVersion, lineKey: line.lineKey, loaded });
      setPending((current) => { const next = current.filter((entry) => entry.lineKey !== line.lineKey); saveLocal(nextQuantities, next); return next; });
    } catch (cause) {
      setPending(nextPending); saveLocal(nextQuantities, nextPending);
      setMessage(cause instanceof Error ? cause.message : "The tick is saved on this terminal and still needs to sync.");
    }
  }

  async function retrySync() {
    setBusy(true); setMessage(null);
    const remaining: PendingTick[] = [];
    for (const entry of pending) {
      try { await setLoadLineState({ tripId: trip.id, planVersion: trip.planVersion, ...entry }); }
      catch (cause) { remaining.push(entry); setMessage(cause instanceof Error ? cause.message : "Some checklist changes still need to sync."); break; }
    }
    setPending(remaining); saveLocal(quantities, remaining); setBusy(false);
  }

  async function beginLoading() {
    setBusy(true); setMessage(null);
    try {
      await startLoading({ tripId: trip.id, planVersion: trip.planVersion, loadingOrderConfirmed: orderConfirmed, reeferTemperatureC: reeferReading === "" ? null : Number(reeferReading), reeferConfirmed });
      setPhase("checklist");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Loading could not be started."); }
    finally { setBusy(false); }
  }

  function openFlag(line: Line) {
    setActiveLine(line); setIssueType("MISSING"); setIssueQuantity(1); setIssueNote(""); setIssuePhoto(null); setMessage(null);
  }

  async function saveFlag() {
    if (!activeLine) return;
    setBusy(true); setMessage(null);
    try {
      const result = await reportLoaderIssue({ tripId: trip.id, planVersion: trip.planVersion, lineKey: activeLine.lineKey, type: issueType, quantity: issueQuantity, note: issueNote, photo: await photoPayload(issuePhoto) });
      setFlags((current) => [...current, { ...result, issueId: result.issueId, note: issueNote || null, photoName: issuePhoto?.name ?? null, withdrawnAt: null }]);
      setQuantities((current) => { const next = { ...current, [activeLine.lineKey]: result.loadedQuantity }; saveLocal(next, pending); return next; });
      setActiveLine(null); setMessage("Flag saved. Dispatcher and the affected Store were notified.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "The flag was not saved. Try again before hand-off."); }
    finally { setBusy(false); }
  }

  async function withdraw(flag: Flag) {
    setBusy(true); setMessage(null);
    try {
      await withdrawLoaderIssue(flag.id);
      setFlags((current) => current.map((entry) => entry.id === flag.id ? { ...entry, withdrawnAt: new Date().toISOString() } : entry));
      setQuantities((current) => ({ ...current, [flag.lineKey]: 0 }));
      setMessage("Flag withdrawn. The checklist line is open again.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "The flag could not be withdrawn."); }
    finally { setBusy(false); }
  }

  async function confirm() {
    setBusy(true); setMessage(null);
    try {
      const result = await confirmTripLoaded(trip.id, trip.planVersion);
      setConfirmed(result); setPhase("success");
      try { localStorage.removeItem(storageKey); } catch { /* Confirmation is already authoritative on the server. */ }
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Loading confirmation failed."); }
    finally { setBusy(false); }
  }

  const tripSummary = <aside className={styles.tripSummary}><h2>{trip.vehicle.id} · Trip {trip.tripNumber}</h2><p>{trip.vehicle.temperature === "REEFER" ? "Reefer" : "Ambient"} {trip.vehicle.type.toLowerCase()} · {trip.vehicle.weightCapacityKg.toLocaleString()} kg · {trip.vehicle.volumeCapacityM3} m³</p><dl><div><dt>Departs</dt><dd>{time(trip.plannedStart)}</dd></div><div><dt>Area</dt><dd>{trip.district} · {trip.brand}</dd></div><div><dt>Stops</dt><dd>{trip.stops.length}</dd></div><div><dt>Load</dt><dd>{plannedUnits} units · {trip.stops.reduce((sum, stop) => sum + stop.weightKg, 0).toLocaleString()} kg</dd></div><div><dt>Plan</dt><dd>Published v{trip.planVersion}</dd></div></dl></aside>;

  if (phase === "success") {
    const snapshot = confirmed ?? { confirmedAt: trip.session?.confirmedAt ?? new Date().toISOString(), plannedUnits, loadedUnits, flags: activeFlags.length };
    return <section className={styles.success}><span className={styles.successIcon}>✓</span><h1>{trip.vehicle.id} is loaded</h1><p>The Driver can now see this server-confirmed hand-off. Dispatcher and affected Stores received any shortfall flags.</p><dl><div><dt>Trip</dt><dd>{trip.vehicle.id} · Trip {trip.tripNumber} · {trip.district}</dd></div><div><dt>Confirmed</dt><dd>{dateTime(snapshot.confirmedAt)}</dd></div><div><dt>Units</dt><dd>{snapshot.loadedUnits} of {snapshot.plannedUnits}</dd></div><div><dt>Flags</dt><dd>{snapshot.flags}</dd></div><div><dt>Status</dt><dd><span className={styles.goodBadge}>✓ Loaded</span></dd></div></dl><Link href="/workspace/loader">Back to trip queue</Link></section>;
  }

  if (phase === "readiness") return <section className={styles.loadPage}><Link className={styles.back} href="/workspace/loader">← Trip queue</Link><header className={styles.heading}><h1>Before you load · {trip.vehicle.id}</h1><p>Trip {trip.tripNumber} · {trip.district} · {trip.vehicle.temperature === "REEFER" ? "chilled" : "ambient"} · departs {time(trip.plannedStart)}</p></header><div className={styles.readinessGrid}><div className={styles.readinessMain}><section className={styles.readinessCard}><div className={styles.cardTitle}><h2>1 · Reefer at temperature</h2><span className={trip.vehicle.temperature === "REEFER" ? styles.requiredBadge : styles.neutralBadge}>{trip.vehicle.temperature === "REEFER" ? "Required" : "Not needed"}</span></div>{trip.vehicle.temperature === "REEFER" ? <><p>Check the reefer display. Record the reading without applying an invented acceptance range.</p><div className={styles.reeferFields}><label>Unit reading (°C)<input inputMode="decimal" type="number" step="0.1" value={reeferReading} onChange={(event) => setReeferReading(event.target.value)} placeholder="Enter reading" /></label><label className={styles.checkboxLabel}><input checked={reeferConfirmed} onChange={(event) => setReeferConfirmed(event.target.checked)} type="checkbox" /> Reefer is at temperature</label></div></> : <p>Ambient trip — no chilled goods on this vehicle.</p>}</section><section className={styles.readinessCard}><div className={styles.cardTitle}><h2>2 · Confirm the loading order</h2><span className={styles.requiredBadge}>Required</span></div><p>Load in reverse delivery order: the last stop goes in first and the first stop stays nearest the doors.</p><ol className={styles.loadingOrder}>{trip.stops.map((stop, index) => <li key={stop.orderId}><b>{index + 1}</b><span><strong>Load {index + 1}{index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th"} · Stop {stop.sequence} · {stop.outletId}</strong><small>{index === 0 ? "Unloads last" : index === trip.stops.length - 1 ? "Unloads first · nearest the doors" : `${stop.units} units`}</small></span></li>)}</ol><label className={styles.confirmOrder}><input checked={orderConfirmed} onChange={(event) => setOrderConfirmed(event.target.checked)} type="checkbox" /> I’ve checked the loading order — last stop loads first</label></section><div className={styles.startActions}><button disabled={busy || !orderConfirmed || (trip.vehicle.temperature === "REEFER" && (!reeferConfirmed || reeferReading === ""))} onClick={beginLoading}>{busy ? "Starting…" : "Start loading"}</button><Link href="/workspace/loader">Back to trip queue</Link></div>{message && <p className={styles.message} role="alert">{message}</p>}</div>{tripSummary}</div></section>;

  if (phase === "review") return <section className={styles.loadPage}><button className={styles.textButton} onClick={() => setPhase("checklist")}>← Back to checklist</button><header className={styles.heading}><h1>Confirm {trip.vehicle.id} is loaded</h1><p>Check the server-backed summary. Documented flags do not block departure.</p></header>{activeFlags.length > 0 && <section className={styles.shortfallBanner}><strong>⚠ {activeFlags.length} documented loading {activeFlags.length === 1 ? "flag" : "flags"}</strong><span>{loadedUnits} of {plannedUnits} units are physically loaded.</span></section>}<div className={styles.reviewGrid}><section className={styles.reviewCard}><h2>By stop, in loading order</h2>{trip.stops.map((stop, index) => { const stopFlags = stop.lines.map((line) => flagFor(line.lineKey)).filter(Boolean) as Flag[]; return <article className={stopFlags.length ? styles.flaggedStop : ""} key={stop.orderId}><b>{index + 1}{index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th"}</b><span>Stop {stop.sequence}</span><strong>{stop.outletId}</strong><small>{stop.orderId}</small><em>{stopFlags.length ? `⚠ ${stopFlags.length} flagged` : "✓ All loaded"}</em></article>; })}</section><aside className={styles.reviewTotals}><h2>Totals</h2><dl><div><dt>Lines</dt><dd>{accountedLines} / {allLines.length}</dd></div><div><dt>Units loaded</dt><dd>{loadedUnits} of {plannedUnits}</dd></div><div><dt>Plan version</dt><dd>v{trip.planVersion}</dd></div><div><dt>Flags</dt><dd>{activeFlags.length}</dd></div></dl><button disabled={busy || !canReview} onClick={confirm}>{busy ? "Confirming…" : "Confirm trip loaded"}</button><button className={styles.secondaryButton} onClick={() => setPhase("checklist")}>Back to checklist</button><p>A documented flag never blocks departure.</p></aside></div>{message && <p className={styles.message} role="alert">{message}</p>}</section>;

  return <section className={styles.loadPage}>{activeLine && <div className={styles.modalBackdrop} role="presentation"><section aria-labelledby="flag-title" aria-modal="true" className={styles.flagModal} role="dialog"><h2 id="flag-title">Flag a problem</h2><strong>{activeLine.description} · {activeLine.productCode}</strong><p>{activeLine.orderId} · planned quantity {activeLine.plannedQuantity}</p><div className={styles.problemTypes}><label className={issueType === "MISSING" ? styles.selectedProblem : ""}><input checked={issueType === "MISSING"} name="problem" onChange={() => setIssueType("MISSING")} type="radio" /><span><b>Missing</b><small>Not found at the dock or short in the pick.</small></span></label><label className={issueType === "DAMAGED" ? styles.selectedProblem : ""}><input checked={issueType === "DAMAGED"} name="problem" onChange={() => setIssueType("DAMAGED")} type="radio" /><span><b>Damaged</b><small>Arrived damaged and is not being loaded.</small></span></label></div><label className={styles.quantityField}>Quantity affected<input max={activeLine.plannedQuantity} min="1" onChange={(event) => setIssueQuantity(Math.max(1, Math.min(activeLine.plannedQuantity, Number(event.target.value) || 1)))} type="number" value={issueQuantity} /></label><label className={styles.noteField}>Note <span>(optional)</span><textarea maxLength={500} onChange={(event) => setIssueNote(event.target.value)} placeholder="What happened?" value={issueNote} /></label><label className={styles.photoField}>Photo evidence <span>(optional, max 700 KB)</span><input accept="image/jpeg,image/png,image/webp" onChange={(event) => setIssuePhoto(event.target.files?.[0] ?? null)} type="file" />{issuePhoto && <small>{issuePhoto.name}</small>}</label><p className={styles.modalHelp}>Dispatcher and the affected Store see this flag before departure.</p><div className={styles.modalActions}><button className={styles.secondaryButton} disabled={busy} onClick={() => setActiveLine(null)}>Cancel</button><button disabled={busy} onClick={saveFlag}>{busy ? "Saving…" : "Save flag"}</button></div>{message && <p className={styles.message} role="alert">{message}</p>}</section></div>}<header className={styles.heading}><h1>Loading {trip.vehicle.id} · Trip {trip.tripNumber}</h1><p>Tick each line as it goes on the truck. Flag anything missing or damaged.</p></header>{(!online || pending.length > 0) && <section className={styles.offlineBanner}><strong>⚠ {!online ? "Offline — changes are saved on this terminal" : `${pending.length} changes waiting to sync`}</strong><span>Keep loading. Confirmation stays disabled until the server acknowledges every tick.</span><button disabled={busy || !online} onClick={retrySync}>Retry sync</button></section>}<div className={styles.checklistGrid}><div><section className={styles.progressCard}><h2>Progress</h2><div className={styles.progress}><span style={{ width: `${allLines.length ? (accountedLines / allLines.length) * 100 : 0}%` }} /></div><strong>{accountedLines} / {allLines.length} lines</strong><small>Loading order confirmed · last stop first</small></section><section className={styles.stopList}>{trip.stops.map((stop, index) => { const stopAccounted = stop.lines.filter((line) => (quantities[line.lineKey] ?? 0) + (flagFor(line.lineKey)?.quantity ?? 0) === line.plannedQuantity).length; return <article className={styles.stopCard} key={stop.orderId}><header><div><strong>Load {index + 1} · Stop {stop.sequence} of {trip.stops.length} · {stop.outletId}</strong><span>{stop.orderId} · {stop.units} units · {stop.weightKg.toLocaleString()} kg · {stop.dockType.replaceAll("_", " ")}</span></div><b>{stopAccounted === stop.lines.length ? "✓" : "◷"} {stopAccounted} / {stop.lines.length}</b></header>{stop.lines.map((line) => { const flag = flagFor(line.lineKey); const fullyLoaded = quantities[line.lineKey] === line.plannedQuantity; return <div className={`${styles.lineRow} ${flag ? styles.flaggedLine : ""}`} key={line.lineKey}><button aria-label={`${fullyLoaded ? "Uncheck" : "Mark loaded"} ${line.description}`} className={`${styles.check} ${fullyLoaded ? styles.checked : ""}`} disabled={busy || Boolean(flag)} onClick={() => toggleLine(line)}>{fullyLoaded ? "✓" : ""}</button><span><strong>{line.description}</strong><small>{line.productCode}</small></span><b>Qty {line.plannedQuantity}</b>{flag ? <div className={styles.flagActions}><span>⚠ {flag.type.toLowerCase()} · {flag.quantity}</span><button disabled={busy} onClick={() => withdraw(flag)}>Withdraw</button></div> : <button className={styles.flagButton} disabled={busy} onClick={() => openFlag(line)}>Flag</button>}</div>; })}</article>; })}</section></div><aside className={styles.checklistAside}>{tripSummary}<section className={styles.reviewAction}><button disabled={!canReview || busy} onClick={() => setPhase("review")}>Review and confirm</button><p>{pending.length ? "Sync pending changes before confirmation." : "You can correct ticks and flags until confirmation."}</p></section></aside></div>{message && <p className={styles.message} role="status">{message}</p>}</section>;
}
