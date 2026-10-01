"use client";

import { useState } from "react";
import styles from "./trip.module.css";

type Mode = "drive" | "stopped" | "recorded" | "sync";

export function DriverTrip() {
  const [mode, setMode] = useState<Mode>("drive");
  const [offline, setOffline] = useState(false);
  const [delivered, setDelivered] = useState(1);
  const [pending, setPending] = useState(0);
  const nextStop = delivered === 1 ? "OUT010" : delivered === 2 ? "OUT009" : "OUT011";
  const eta = delivered === 1 ? "04:57" : delivered === 2 ? "05:19" : "05:43";
  const window = delivered === 1 ? "05:00–07:30" : delivered === 2 ? "04:00–07:45" : "03:00–08:00";

  function recordDelivery() {
    const nextDelivered = delivered + 1;
    setDelivered(nextDelivered);
    if (offline) setPending((value) => value + 1);
    setMode("recorded");
  }

  if (mode === "sync") return <section><header className={styles.syncHeader}><h1>Sync</h1><span>{pending ? "Needs review" : "Up to date"}</span></header>{pending ? <><aside className={styles.warning}><strong>△ {pending} record needs your review</strong><p>Everything else sent in time order. Nothing is treated as synced until the server confirms it.</p></aside><section className={styles.syncList}><article><strong>OUT008 · Delivered</strong><span>Stop 1 · 04:36</span><b>Synced</b></article><article><strong>OUT010 · Delivered</strong><span>Stop 2 · 05:03 · saved offline</span><b>Needs review</b></article></section><button className={styles.primary} onClick={() => { setPending(0); setOffline(false); setMode("drive"); }}>Keep my record and sync</button></> : <><aside className={styles.success}><strong>✓ Up to date</strong><p>All delivery records are on the server. Pending count cleared.</p></aside><button className={styles.primary} onClick={() => setMode("drive")}>Continue trip</button></>}</section>;

  if (mode === "recorded") return <section className={styles.recorded}><span>{offline ? "↻" : "✓"}</span><h1>{offline ? "Saved offline" : "Delivered"}</h1><p>{offline ? "The delivery is kept on this phone and sends automatically when the signal returns." : "The store manager will confirm what arrived."}</p><dl><div><dt>Stop</dt><dd>{delivered - 1} of 5 · {delivered === 2 ? "OUT010" : "OUT009"}</dd></div><div><dt>Recorded</dt><dd>Wed 25 Mar · {delivered === 2 ? "05:03" : "05:21"}{offline ? " (phone time)" : ""}</dd></div><div><dt>Sync</dt><dd>{offline ? `Waiting to sync ${pending} record` : "Up to date"}</dd></div></dl><section className={styles.next}><small>NEXT</small><strong>{nextStop} · ETA {eta}</strong><span>Window {window}</span></section>{offline && <button className={styles.secondary} onClick={() => { setOffline(false); setMode("sync"); }}>Reconnect and sync</button>}<button className={styles.primary} onClick={() => setMode("drive")}>Resume driving</button></section>;

  if (mode === "stopped") return <section><header className={styles.tripHeading}><small>{offline ? "No signal · saved offline" : "Up to date"}</small><strong>Stopped at {nextStop}</strong></header><section className={styles.stopCard}><p>STOP {delivered + 1} OF 5</p><h1>{nextStop}</h1><dl><div><dt>Dock</dt><dd>Rear dock</dd></div><div><dt>Parking</dt><dd>Normal</dd></div><div><dt>Window</dt><dd>{window}</dd></div><div><dt>Order</dt><dd>ORD0096797 · 45 units</dd></div></dl><aside className={styles.shortfall}><strong>△ Expected shortfall</strong><p>1 carton of Instant noodles was damaged at loading and is not on the truck.</p></aside></section><button className={styles.primary} onClick={recordDelivery}>Mark delivered</button><button className={styles.secondary}>Can’t deliver</button><button className={styles.linkButton}>Report a problem</button></section>;

  return <section><header className={styles.tripHeading}><small>{offline ? "No signal · saved offline" : "Driving · Stop 1 delivered 04:36"}</small><strong>VEH012 · Trip 1</strong></header>{offline && <aside className={styles.offline}>⌁ Offline — changes are saved on this phone</aside>}<section className={styles.driveCard}><small>NEXT STOP</small><h1>{nextStop}</h1><p>Stop {delivered + 1} of 5 · Rear dock</p><div><span><small>ETA</small><strong>{eta}</strong></span><span><small>WINDOW</small><strong>{window}</strong></span></div><p className={styles.progress}><i style={{ width: `${(delivered / 5) * 100}%` }} />{delivered} of 5 stops done</p></section><button className={styles.primary} onClick={() => setMode("stopped")}>I’ve stopped safely</button><button className={styles.secondary}>Open navigation</button><button className={styles.linkButton} onClick={() => setOffline((value) => !value)}>{offline ? "Simulate signal return" : "Simulate connectivity loss"}</button></section>;
}
