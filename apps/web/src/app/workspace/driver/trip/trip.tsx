"use client";

import { useState } from "react";
import styles from "./trip.module.css";

type Mode = "drive" | "stopped" | "navigation" | "problem" | "recorded";

export function DriverTrip() {
  const [mode, setMode] = useState<Mode>("drive");

  if (mode === "navigation") {
    return (
      <section className={styles.mapScreen}>
        <div className={styles.mapBanner}><span>→</span><strong>Turn right in 300 m</strong><small>then continue 1.1 km</small></div>
        <div className={styles.mapMock}><i /></div>
        <section className={styles.mapSheet}>
          <strong>OUT010 - Stop 2 of 5</strong>
          <span>ETA 04:57 - 3.9 km - 8 min</span>
          <em>◷ Illustrative map</em>
          <button onClick={() => setMode("drive")}>Exit navigation</button>
          <p>Voice guidance is on. Keep your eyes on the road.</p>
        </section>
      </section>
    );
  }

  if (mode === "problem") {
    return (
      <section className={styles.problem}>
        <h1>Report a problem</h1>
        <p>For trip problems only. The store reports product shortages when confirming receipt.</p>
        <button onClick={() => setMode("recorded")}>Store closed</button>
        <button onClick={() => setMode("recorded")}>Access blocked</button>
        <button onClick={() => setMode("stopped")} className={styles.secondary}>Back to stop</button>
      </section>
    );
  }

  if (mode === "recorded") {
    return (
      <section className={styles.recorded}>
        <span>✓</span>
        <h1>Delivered</h1>
        <p>The store manager will confirm what arrived.</p>
        <dl>
          <div><dt>Stop</dt><dd>2 of 5 - OUT010</dd></div>
          <div><dt>Recorded</dt><dd>Wed 25 Mar - 05:03</dd></div>
          <div><dt>Sync</dt><dd>Up to date</dd></div>
        </dl>
        <section className={styles.next}><small>NEXT</small><strong>OUT009 - ETA 05:19</strong><span>Window 04:00-07:45</span></section>
        <button className={styles.primary} onClick={() => setMode("drive")}>Resume driving</button>
      </section>
    );
  }

  if (mode === "stopped") {
    return (
      <section>
        <section className={styles.stopCard}>
          <p>STOP 2 OF 5</p>
          <h1>OUT010</h1>
          <dl>
            <div><dt>Dock</dt><dd>Rear dock</dd></div>
            <div><dt>Parking</dt><dd>Normal</dd></div>
            <div><dt>Window</dt><dd>05:00-07:30</dd></div>
            <div><dt>Order</dt><dd>ORD0096797 - 45 units</dd></div>
          </dl>
          <aside><strong>△ Expected shortfall</strong><p>1 carton of Instant noodles was damaged at loading and is not on the truck.</p></aside>
        </section>
        <button className={styles.primary} onClick={() => setMode("recorded")}>Mark delivered</button>
        <button className={styles.secondary} onClick={() => setMode("problem")}>Cannot deliver</button>
        <button className={styles.linkButton} onClick={() => setMode("problem")}>Report a problem</button>
      </section>
    );
  }

  return (
    <section>
      <section className={styles.driveCard}>
        <small>NEXT STOP</small>
        <h1>OUT010</h1>
        <p>Stop 2 of 5 - Rear dock</p>
        <div><span><small>ETA</small><strong>04:57</strong></span><span><small>Window</small><strong>05:00-07:30</strong></span></div>
        <em>◷ Window opens at 05:00</em>
        <p className={styles.progress}><i style={{ width: "20%" }} />1 of 5 stops done</p>
      </section>
      <button className={styles.primary} onClick={() => setMode("stopped")}>I have stopped safely</button>
      <button className={styles.secondary} onClick={() => setMode("navigation")}>Open navigation</button>
      <p className={styles.hint}>Delivery details unlock after you have stopped. Navigation is optional.</p>
    </section>
  );
}
