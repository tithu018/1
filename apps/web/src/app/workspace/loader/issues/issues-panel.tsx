"use client";

import { useState } from "react";
import styles from "./issues.module.css";

const filters = ["This shift", "Yesterday", "All"] as const;

export function IssuesPanel({ issues }: { issues: Array<{ row: string[]; day: string }> }) {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("This shift");
  const [today] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" }));
  const [yesterday] = useState(() => new Date(Date.now() - 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" }));
  const visible = issues.filter((issue) => activeFilter === "All" || issue.day === (activeFilter === "Yesterday" ? yesterday : today));

  return (
    <section className={styles.issues}>
      <header className={styles.heading}>
        <h1>Loading issues</h1>
        <p>Missing or damaged items flagged at the dock, and what happened next</p>
      </header>

      <div className={styles.filters} aria-label="Issue filters">
        {filters.map((filter) => (
          <button className={filter === activeFilter ? styles.activeFilter : ""} key={filter} onClick={() => setActiveFilter(filter)} type="button">
            {filter}
          </button>
        ))}
      </div>

      <section className={styles.tableCard}>
        <table>
          <thead>
            <tr>
              <th>Flagged</th>
              <th>Vehicle</th>
              <th>Outlet - order</th>
              <th>Product</th>
              <th>Problem</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ row: issue }) => (
              <tr key={issue[2]}>
                <td>{issue[0]}</td>
                <td>{issue[1]}</td>
                <td>{issue[2]}</td>
                <td>{issue[3]}</td>
                <td>{issue[4]}</td>
                <td>
                  <span className={`${styles.badge} ${issue[5].startsWith("Resolved") ? styles.resolved : styles.reported}`}>
                    {issue[5].startsWith("Resolved") ? "✓" : "◷"} {issue[5]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && <p>No loading issues for this period.</p>}
        <p>Statuses follow the shared issue lifecycle: Reported → Acknowledged → Under review → Resolved.</p>
      </section>
    </section>
  );
}
