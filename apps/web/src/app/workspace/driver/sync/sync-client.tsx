"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CircleCheck, Clock3, CloudUpload, RefreshCw, TriangleAlert, Wifi, WifiOff } from "lucide-react";
import ui from "../driver.module.css";
import { useRouter } from "next/navigation";
import { readPending, writePending, type PendingDelivery } from "@/lib/driver-offline";
import { recordDriverOutcome, resolveDriverSyncConflict } from "@/lib/workflow-actions";
import styles from "./sync.module.css";

type Record = { id: string; operationId: string; entityId: string; status: string; createdAt: string; clientOutcome: string; serverStatus: string };
export function DriverSyncClient({ accountId, records }: { accountId: string; records: Record[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingDelivery[]>([]), [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const syncing = useRef(false);
  useEffect(() => { const refresh = () => { setPending(readPending(accountId)); setOnline(navigator.onLine); }; const timer = setTimeout(refresh, 0); window.addEventListener("online", refresh); window.addEventListener("offline", refresh); return () => { clearTimeout(timer); window.removeEventListener("online", refresh); window.removeEventListener("offline", refresh); }; }, [accountId]);
  const sync = useCallback(async () => {
    if (syncing.current || !navigator.onLine) return;
    syncing.current = true;
    setBusy(true); setError(null);
    try {
      const remaining = [...readPending(accountId)];
      while (remaining.length) { await recordDriverOutcome(remaining[0]); remaining.shift(); writePending(accountId, remaining); setPending([...remaining]); }
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sync failed. Your pending records are retained."); } finally { syncing.current = false; setBusy(false); }
  }, [accountId, router]);
  useEffect(() => {
    const reconnect = () => { if (readPending(accountId).length) void sync(); };
    const timer = setTimeout(reconnect, 0);
    window.addEventListener("online", reconnect);
    return () => { clearTimeout(timer); window.removeEventListener("online", reconnect); };
  }, [accountId, sync]);
  async function resolve(operationId: string, choice: "KEEP_LOCAL" | "KEEP_SERVER") { setBusy(true); setError(null); try { await resolveDriverSyncConflict(operationId, choice); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Resolution failed."); } finally { setBusy(false); } }
  const conflicts = records.filter((record) => record.status === "CONFLICT");
  return <div className={ui.page}>
    <header className={ui.title}><div><span className={ui.eyebrow}>Delivery records</span><h1>Sync centre</h1><p>Saved on your phone. Confirmed by the server.</p></div><span className={ui.tag}>{online ? <Wifi /> : <WifiOff />}{online ? "Online" : "Offline"}</span></header>
    <div className={ui.stats}><article className={ui.stat}><CloudUpload /><strong>{pending.length}</strong><span>On this device</span></article><article className={ui.stat}><CircleCheck /><strong>{records.filter((record) => record.status === "ACKNOWLEDGED").length}</strong><span>Recent confirmations</span></article><article className={ui.stat}><TriangleAlert /><strong>{conflicts.length}</strong><span>Need review</span></article></div>
    {pending.length > 0 && <section className={ui.hero}><span className={ui.eyebrow}>Awaiting confirmation</span><h2>{pending.length} {pending.length === 1 ? "record" : "records"} to send</h2><p><CloudUpload />Your saved records stay on this device until the server responds.</p><button className={ui.primary} disabled={busy || !online} onClick={sync}><RefreshCw />{busy ? "Syncing…" : "Sync now"}</button></section>}
    {error && <p className={ui.error} role="alert">{error}</p>}
    <section className={ui.card}><div className={ui.sectionHeading}><h2><Clock3 />Recent activity</h2><span>{pending.length + records.length} records</span></div><div className={styles.records}>
      {pending.map((record) => <article className={styles.record} key={record.operationId}><span className={styles.recordIcon}><CloudUpload /></span><div><strong>{record.orderId}</strong><p>{record.outcome === "DELIVERED" ? "Delivery saved" : "Problem saved"} · On this device</p></div><span className={styles.waiting}>Pending</span></article>)}
      {records.map((record) => <article className={`${styles.record} ${record.status === "CONFLICT" ? styles.conflict : ""}`} key={record.id}><span className={styles.recordIcon}>{record.status === "ACKNOWLEDGED" ? <CircleCheck /> : record.status === "CONFLICT" ? <TriangleAlert /> : <Clock3 />}</span><div><strong>{record.entityId}</strong><p>{new Date(record.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Colombo", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></div><span className={record.status === "ACKNOWLEDGED" ? styles.confirmed : styles.waiting}>{record.status === "ACKNOWLEDGED" ? "Confirmed" : record.status === "CONFLICT" ? "Review" : "Pending"}</span>{record.status === "CONFLICT" && <div className={styles.resolution}><dl><div><dt>Saved outcome</dt><dd>{record.clientOutcome.replaceAll("_", " ")}</dd></div><div><dt>Server status</dt><dd>{record.serverStatus.replaceAll("_", " ")}</dd></div></dl><div><button className={ui.secondary} disabled={busy || !online} onClick={() => resolve(record.operationId, "KEEP_SERVER")}>Keep server record</button><button className={ui.primary} disabled={busy || !online} onClick={() => resolve(record.operationId, "KEEP_LOCAL")}>Use saved outcome</button></div></div>}</article>)}
    </div>{!pending.length && !records.length && <div className={ui.empty}><CloudUpload /><h2>Nothing waiting to sync</h2><p>Your delivery records will appear here.</p></div>}</section>
  </div>;
}
