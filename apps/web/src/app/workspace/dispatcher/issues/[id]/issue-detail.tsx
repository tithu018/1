"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ClipboardCheck, History, Save, TriangleAlert } from "lucide-react";
import { transitionIssue } from "@/lib/workflow-actions";
import { displayDate, displayTime, label } from "@/lib/format";
import styles from "./issue-detail.module.css";

type Issue = { id: string; status: string; summary: string; order: {
  id: string; outlet: { id: string; brand: string };
  proofAssets: { id: string; type: string; storageKey: string }[];
  deliveryOutcome: { outcome: string; receiverName: string | null; note: string | null } | null;
  receipt: { receivedUnits: number; expectedUnits: number; outcome: string; note: string | null; confirmedAt: string } | null;
}; events: { from: string | null; to: string; note: string | null; createdAt: string; actor: { displayName: string } | null }[];
loadIssue: { id: string; type: string; summary: string; photoName: string | null; quantity: number | null; note: string | null } | null };

export function IssueDetail({ issue }: Readonly<{ issue: Issue }>) {
  const router = useRouter();
  const [note, setNote] = useState(""), [saving, setSaving] = useState(false), [error, setError] = useState<string | null>(null);
  const next = issue.status === "REPORTED" || issue.status === "REOPENED" ? "ACKNOWLEDGED" : issue.status === "ACKNOWLEDGED" ? "UNDER_REVIEW" : issue.status === "UNDER_REVIEW" ? "RESOLVED" : "REOPENED";
  const action = next === "ACKNOWLEDGED" ? "Acknowledge case" : next === "UNDER_REVIEW" ? "Start review" : next === "RESOLVED" ? "Resolve case" : "Reopen case";
  async function advance(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(null);
    try { await transitionIssue(issue.id, next, note.trim()); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Issue transition failed."); setSaving(false); }
  }
  return <section className={styles.page}><Link href="/workspace/dispatcher/attention"><ArrowLeft size={16} />Back to cases</Link>
    <header><div><p>ISSUE DETAIL</p><h1>{issue.order.outlet.id}</h1><span>{issue.order.id} · {label(issue.order.outlet.brand)} · {issue.id}</span></div><strong>{label(issue.status)}</strong></header>
    <p className={styles.summary}><TriangleAlert size={20} />{issue.summary}</p>
    <div className={styles.grid}><section className={styles.card}><h2><History size={20} />Case history</h2><ol>{issue.events.map((event, index) => <li key={`${event.createdAt}-${index}`}><b>{label(event.to)}</b>{event.note && <span>{event.note}</span>}<small>{displayDate(event.createdAt)} · {displayTime(event.createdAt)}{event.actor ? ` · ${event.actor.displayName}` : ""}</small></li>)}</ol></section>
      <section className={styles.card}><h2><ClipboardCheck size={20} />Delivery evidence</h2><dl>
        <div><dt>Loader report</dt><dd>{issue.loadIssue ? `${issue.loadIssue.quantity ?? "—"} units · ${issue.loadIssue.note ?? "No note"}` : "No loading report"}</dd></div>
        <div><dt>Loader problem</dt><dd>{issue.loadIssue ? `${label(issue.loadIssue.type)} · ${issue.loadIssue.summary}` : "Not recorded"}</dd></div>
        <div><dt>Loader evidence</dt><dd>{issue.loadIssue?.photoName ? <a href={`/api/load-issues/${issue.loadIssue.id}/photo`} rel="noreferrer" target="_blank">View {issue.loadIssue.photoName}</a> : "None"}</dd></div>
        <div><dt>Driver outcome</dt><dd>{issue.order.deliveryOutcome ? label(issue.order.deliveryOutcome.outcome) : "Not recorded"}</dd></div>
        <div><dt>Receiver</dt><dd>{issue.order.deliveryOutcome?.receiverName ?? "Not recorded"}</dd></div>
        <div><dt>Driver note</dt><dd>{issue.order.deliveryOutcome?.note || "No note"}</dd></div>
        <div><dt>Store verification</dt><dd>{issue.order.receipt ? `${issue.order.receipt.receivedUnits}/${issue.order.receipt.expectedUnits} units · ${label(issue.order.receipt.outcome)}` : "Not recorded"}</dd></div>
        {issue.order.receipt && <><div><dt>Store note</dt><dd>{issue.order.receipt.note || "No note"}</dd></div><div><dt>Verified at</dt><dd>{displayDate(issue.order.receipt.confirmedAt)} · {displayTime(issue.order.receipt.confirmedAt)}</dd></div></>}
        <div><dt>Proof records</dt><dd>{issue.order.proofAssets.length ? issue.order.proofAssets.map((asset) => label(asset.type)).join(", ") : "None"}</dd></div>
      </dl></section></div>
    <form className={styles.action} onSubmit={advance}><h2>{action}</h2><label htmlFor="case-note">Case note</label><textarea id="case-note" required maxLength={2000} disabled={saving} value={note} onChange={(event) => setNote(event.target.value)} placeholder={next === "RESOLVED" ? "Record the resolution and action taken" : "Record the action taken"} /><button disabled={saving || !note.trim()}><Save size={17} />{saving ? "Saving…" : action}</button>{error && <p role="alert">{error}</p>}</form>
  </section>;
}
