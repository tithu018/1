"use client";

import Link from "next/link";
import { useState } from "react";
import { acknowledgePlanChange } from "../load/actions";
import styles from "./change.module.css";

export function ChangeAcknowledgement({ planId, tripId }: Readonly<{ planId: string; tripId: string | null }>) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function acknowledge() {
    setBusy(true); setError(null);
    try { await acknowledgePlanChange(planId); setAcknowledged(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The plan change could not be acknowledged."); }
    finally { setBusy(false); }
  }
  return <div className={styles.actions}>{!acknowledged ? <button disabled={busy} onClick={acknowledge}>{busy ? "Recording…" : "Acknowledge change"}</button> : tripId ? <Link href={`/workspace/loader/load?trip=${encodeURIComponent(tripId)}`}>Continue to re-verification</Link> : <Link href="/workspace/loader">Return to queue</Link>}<span>{acknowledged ? "Acknowledged in the audit trail. Re-verify before Driver hand-off." : "Your acknowledgement is timestamped and recorded."}</span>{error && <p role="alert">{error}</p>}</div>;
}
