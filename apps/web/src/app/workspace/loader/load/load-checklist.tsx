"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./load-checklist.module.css";

const stops = [
  ["Load 1st", "Stop 7", "OUT045", "ORD0096832", "33 units", "Moved from VEH025"],
  ["Load 2nd", "Stop 6", "OUT044", "ORD0096831", "45 units", "Moved from VEH025"],
  ["Load 3rd", "Stop 5", "OUT042", "ORD0096828", "115 units", "Moved from VEH025"],
  ["Load 4th", "Stop 4", "OUT040", "ORD0096824", "103 units", "Loaded on VEH009"],
  ["Load 5th", "Stop 3", "OUT046", "ORD0096833", "35 units", "Loaded on VEH009"],
  ["Load 6th", "Stop 2", "OUT043", "ORD0096830", "34 units", "Loaded on VEH009"],
  ["Load 7th", "Stop 1", "OUT041", "ORD0096826", "52 units", "Loaded on VEH009"]
] as const;

export function LoadChecklist() {
  const [checked, setChecked] = useState<Set<string>>(() => new Set(stops.map((stop) => stop[2])));
  const [confirmed, setConfirmed] = useState(false);
  const progress = useMemo(() => checked.size / stops.length, [checked]);

  function toggle(outlet: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(outlet)) next.delete(outlet);
      else next.add(outlet);
      return next;
    });
  }

  if (confirmed) {
    return (
      <section className={styles.success}>
        <span className={styles.successIcon}>✓</span>
        <h1>VEH009 is loaded</h1>
        <p>Plan v2 is verified. The reassigned driver can now see the Kalutara trip.</p>
        <dl>
          <div>
            <dt>Trip</dt>
            <dd>VEH009 - Trip 1 - Kalutara</dd>
          </div>
          <div>
            <dt>Confirmed</dt>
            <dd>Wed 25 Mar 2026 - 03:44 - by you</dd>
          </div>
          <div>
            <dt>Moved from VEH025</dt>
            <dd>3 stops</dd>
          </div>
          <div>
            <dt>Flags</dt>
            <dd>None</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className={styles.greenBadge}>✓ Loaded</span>
            </dd>
          </div>
        </dl>
        <Link href="/workspace/loader">Back to trip queue</Link>
      </section>
    );
  }

  return (
    <section className={styles.verify}>
      <header className={styles.heading}>
        <h1>Re-verify VEH009 - Kalutara</h1>
        <p>Confirm each stop is on VEH009 in loading order.</p>
      </header>

      <section className={styles.stopList}>
        {stops.map(([load, stop, outlet, order, units, status]) => {
          const isChecked = checked.has(outlet);
          const moved = status === "Moved from VEH025";

          return (
            <article className={styles.stopRow} key={outlet}>
              <button
                aria-label={`${isChecked ? "Uncheck" : "Check"} ${outlet}`}
                className={`${styles.check} ${isChecked ? styles.checked : ""}`}
                onClick={() => toggle(outlet)}
                type="button"
              >
                {isChecked && "✓"}
              </button>
              <strong>
                {load} - {stop} - {outlet}
              </strong>
              <span className={styles.order}>
                {order} - {units}
              </span>
              <span className={`${styles.statusBadge} ${moved ? styles.moved : styles.loadedOnTruck}`}>
                {moved ? "⚠" : "✓"} {status}
              </span>
            </article>
          );
        })}
      </section>

      <footer className={styles.actions}>
        <button disabled={checked.size !== stops.length} onClick={() => setConfirmed(true)} type="button">
          Confirm VEH009 loaded
        </button>
        <div className={styles.progress} aria-label={`${checked.size} of ${stops.length} stops checked`}>
          <span style={{ width: `${progress * 100}%` }} />
        </div>
        <strong>
          {checked.size} / {stops.length} stops
        </strong>
      </footer>
    </section>
  );
}
