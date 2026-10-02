"use client";

import { useState } from "react";
import styles from "./issues.module.css";

const filters = ["This shift", "Yesterday", "All"] as const;

const issues = [
  ["Wed 25 Mar - 03:47", "VEH012", "OUT010 - ORD0096797", "Instant noodles - FR-D07", "Damaged - 1", "Reported"],
  ["Tue 24 Mar - 03:58", "VEH022", "OUT010 - ORD0096653", "Cream crackers - FR-D08", "Missing - 2", "Resolved - ISS-0417"]
] as const;

export function IssuesPanel() {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("This shift");

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
            {issues.map((issue) => (
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
        <p>Statuses follow the shared issue lifecycle: Reported → Acknowledged → Under review → Resolved.</p>
      </section>
    </section>
  );
}
