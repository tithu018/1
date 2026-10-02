"use client";

import { useState } from "react";
import styles from "./sync.module.css";

type SyncState = "online" | "offline" | "review" | "synced";

export function DriverSyncClient() {
  const [state, setState] = useState<SyncState>(() => typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online");
  const [pending, setPending] = useState(() => typeof localStorage !== "undefined" && localStorage.getItem("waypoint-driver-pending") ? 1 : 0);
  function saveOffline() { localStorage.setItem("waypoint-driver-pending", "1"); setPending(1); setState("offline"); }
  function reconnect() { setState("review"); }
  function resolve() { localStorage.removeItem("waypoint-driver-pending"); setPending(0); setState("synced"); }
  const isOffline = state === "offline";
  return <section className={styles.sync}><header><div><h1>Sync</h1><p>{isOffline ? "Saved on this device" : state === "review" ? "Needs review" : "Trip records and proof status"}</p></div><span className={isOffline ? styles.offline : state === "review" ? styles.review : styles.online}>{isOffline ? "Offline" : state === "review" ? "Review" : state === "synced" ? "Synced" : "Online"}</span></header>{isOffline && <aside className={styles.attention}><strong>Saved offline</strong><p>Your delivery outcome is stored locally. It is not server-confirmed until the connection returns.</p><button onClick={reconnect}>Retry sync</button></aside>}{state === "review" && <aside className={styles.conflict}><strong>One record needs review</strong><p>The server has a newer outcome for OUT010. Keep the server record or send the saved Driver outcome.</p><button onClick={resolve}>Keep server record and sync</button><button className={styles.secondary} onClick={resolve}>Send Driver record</button></aside>}{state === "synced" && <aside><strong>Synced successfully</strong><p>All pending delivery records are acknowledged by the server.</p></aside>}<section><article><strong>OUT008 - Delivered</strong><span>Stop 1 - Server acknowledged</span><b>Synced</b></article><article><strong>OUT010 - {isOffline || state === "review" ? "Delivery outcome" : "Next stop"}</strong><span>{isOffline ? "Saved locally - pending acknowledgement" : state === "review" ? "Conflict requires a decision" : "Stop 2 - ETA 04:57"}</span><b>{isOffline ? "Pending" : state === "review" ? "Review" : "Ready"}</b></article></section>{isOffline && <button className={styles.demoAction} onClick={saveOffline}>Save another offline record</button>}<p className={styles.note}>Pending count: {pending}</p></section>;
}