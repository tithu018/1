"use client";

import { useState } from "react";
import styles from "./issues.module.css";

const filters = ["This shift", "Yesterday", "All"] as const;
type Issue = { id: string; day: string; flagged: string; vehicle: string; outletOrder: string; product: string; problem: string; status: string; hasPhoto: boolean; withdrawn: boolean };

export function IssuesPanel({ issues }: Readonly<{ issues: Issue[] }>) {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("This shift");
  const [today] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" }));
  const [yesterday] = useState(() => new Date(Date.now() - 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" }));
  const visible = issues.filter((issue) => activeFilter === "All" || issue.day === (activeFilter === "Yesterday" ? yesterday : today));
  return <section className={styles.issues}><header className={styles.heading}><h1>Loading issues</h1><p>Missing or damaged items flagged at the dock, and what happened next</p></header><div className={styles.filters} aria-label="Issue filters">{filters.map((filter) => <button aria-pressed={filter === activeFilter} className={filter === activeFilter ? styles.activeFilter : ""} key={filter} onClick={() => setActiveFilter(filter)}>{filter}</button>)}</div><section className={styles.tableCard}><div className={styles.headerRow}><span>Flagged</span><span>Vehicle</span><span>Outlet · order</span><span>Product</span><span>Problem</span><span>Status</span></div><div className={styles.issueRows}>{visible.map((issue) => <article className={issue.withdrawn ? styles.withdrawn : ""} key={issue.id}><time>{issue.flagged}</time><b>{issue.vehicle}</b><strong>{issue.outletOrder}</strong><span>{issue.product}</span><p>{issue.problem}{issue.hasPhoto && <> · <a href={`/api/load-issues/${issue.id}/photo`} rel="noreferrer" target="_blank">View photo</a></>}</p><em className={`${styles.badge} ${issue.status.startsWith("Resolved") || issue.withdrawn ? styles.resolved : styles.reported}`}>{issue.status.startsWith("Resolved") || issue.withdrawn ? "✓" : "◷"} {issue.withdrawn ? "Withdrawn" : issue.status}</em></article>)}</div>{!visible.length && <p>No loading issues for this period.</p>}<footer>Statuses follow the shared issue lifecycle: Reported → Acknowledged → Under review → Resolved.</footer></section></section>;
}
