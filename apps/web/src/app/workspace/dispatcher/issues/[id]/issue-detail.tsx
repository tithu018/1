"use client";

import Link from "next/link";
import { useState } from "react";
import { transitionIssue } from "@/lib/workflow-actions";
import styles from "./issue-detail.module.css";

type Issue = { id: string; status: string; summary: string; order: { id: string; outlet: { id: string; brand: string }; proofAssets: { id: string; type: string; storageKey: string }[]; deliveryOutcome: { outcome: string; receiverName: string | null; note: string | null } | null }; events: { from: string | null; to: string; note: string | null; createdAt: string }[]; loadIssue: { quantity: number | null; note: string | null } | null };

export function IssueDetail({ issue }: Readonly<{ issue: Issue }>) {
  const [status, setStatus] = useState(issue.status);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const next = status === "REPORTED" ? "ACKNOWLEDGED" : status === "ACKNOWLEDGED" ? "UNDER_REVIEW" : status === "UNDER_REVIEW" ? "RESOLVED" : status === "RESOLVED" ? "REOPENED" : "ACKNOWLEDGED";
  async function advance() { try { await transitionIssue(issue.id, next as "ACKNOWLEDGED" | "UNDER_REVIEW" | "RESOLVED" | "REOPENED", note); setStatus(next); setNote(""); setMessage(`Issue moved to ${next.replaceAll("_", " ")}.`); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Issue transition failed."); } }
  return <section className={styles.page}><header><div><p>ISSUE DETAIL</p><h1>{issue.id}</h1><span>{issue.order.id} - {issue.order.outlet.id} - {issue.order.outlet.brand}</span></div><strong>{status.replaceAll("_", " ")}</strong></header><div className={styles.grid}><section className={styles.card}><h2>Lifecycle</h2><ol>{issue.events.map((event) => <li key={`${event.to}-${event.createdAt}`}><b>{event.to.replaceAll("_", " ")}</b><span>{event.note ?? new Date(event.createdAt).toLocaleString("en-GB")}</span></li>)}</ol></section><section className={styles.card}><h2>Evidence comparison</h2><dl><div><dt>Summary</dt><dd>{issue.summary}</dd></div><div><dt>Loader quantity</dt><dd>{issue.loadIssue?.quantity ?? "Not recorded"}</dd></div><div><dt>Driver outcome</dt><dd>{issue.order.deliveryOutcome?.outcome ?? "Not recorded"}</dd></div><div><dt>Receiver</dt><dd>{issue.order.deliveryOutcome?.receiverName ?? "Not recorded"}</dd></div><div><dt>Proof assets</dt><dd>{issue.order.proofAssets.length ? issue.order.proofAssets.map((asset) => asset.type).join(", ") : "None"}</dd></div></dl></section></div>{status !== "RESOLVED" || status === "RESOLVED" ? <section className={styles.action}><h2>{status === "RESOLVED" ? "Reopen case" : `Move to ${next.replaceAll("_", " ")}`}</h2><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Required case note" /><button onClick={advance}>Save lifecycle transition</button>{message && <p role="status">{message}</p>}</section> : null}<Link href="/workspace/dispatcher/attention">Back to Needs Attention</Link></section>;
}