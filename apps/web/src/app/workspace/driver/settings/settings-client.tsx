"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./settings.module.css";

export function DriverSettings() {
  const [theme, setTheme] = useState<"day" | "night">("day");
  const [voice, setVoice] = useState(true);
  const [mobileData, setMobileData] = useState(true);

  return <section className={`${styles.settings} ${theme === "night" ? styles.night : ""}`}>
    <header><Link href="/workspace/driver">←</Link><div><h1>Settings</h1><p>Driver app preferences</p></div></header>

    <section className={styles.card}><h2>Appearance</h2><p>Choose the display that is easiest to read.</p><div className={styles.segmented}><button className={theme === "day" ? styles.selected : ""} onClick={() => setTheme("day")} type="button"><span>☀</span>Day</button><button className={theme === "night" ? styles.selected : ""} onClick={() => setTheme("night")} type="button"><span>☾</span>Night</button></div></section>

    <section className={styles.card}><h2>Navigation</h2><label><span><strong>Voice guidance</strong><small>Read turn instructions aloud while driving.</small></span><input checked={voice} onChange={(event) => setVoice(event.target.checked)} type="checkbox" /></label><div className={styles.selectRow}><span><strong>Preferred map app</strong><small>Used when you open navigation.</small></span><select defaultValue="waypoint"><option value="waypoint">Waypoint map</option><option value="google">Google Maps</option></select></div></section>

    <section className={styles.card}><h2>Sync</h2><label><span><strong>Use mobile data</strong><small>Sync delivery outcomes when Wi-Fi is unavailable.</small></span><input checked={mobileData} onChange={(event) => setMobileData(event.target.checked)} type="checkbox" /></label><div className={styles.statusRow}><span><strong>Offline storage</strong><small>Trip data is available on this device.</small></span><b>Ready</b></div></section>

    <section className={styles.card}><h2>Account</h2><dl><div><dt>Driver</dt><dd>Nimal Perera</dd></div><div><dt>Vehicle</dt><dd>VEH012</dd></div><div><dt>Language</dt><dd>English</dd></div><div><dt>App version</dt><dd>1.0.0</dd></div></dl></section>
  </section>;
}
