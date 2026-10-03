"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readPending, writePending, type PendingDelivery } from "@/lib/driver-offline";
import { recordDriverOutcome, resolveDriverSyncConflict } from "@/lib/workflow-actions";
import styles from "./sync.module.css";

type Record = { id: string; operationId: string; entityId: string; status: string };
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
  return <section className={styles.sync}><header><div><h1>Sync</h1><p>Delivery records and server acknowledgement</p></div><span>{online ? "Online" : "Offline"}</span></header>{pending.length > 0 && <aside className={styles.attention}><strong>{pending.length} records saved on this device</strong><button disabled={busy || !online} onClick={sync}>{busy ? "Syncing…" : "Retry sync"}</button></aside>}{error && <p role="alert">{error}</p>}<section>{pending.map((record) => <article key={record.operationId}><strong>{record.orderId}</strong><span>Saved offline</span><b>Pending</b></article>)}{records.map((record) => <article key={record.id}><strong>{record.entityId}</strong><b>{record.status}</b>{record.status === "CONFLICT" && <div><button disabled={busy} onClick={() => resolve(record.operationId, "KEEP_SERVER")}>Keep server record</button><button disabled={busy} onClick={() => resolve(record.operationId, "KEEP_LOCAL")}>Send saved driver record</button></div>}</article>)}{!pending.length && !records.length && <p>No delivery records to sync yet.</p>}</section></section>;
}
