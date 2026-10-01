"use client";

import { useMemo, useState } from "react";
import styles from "./load-checklist.module.css";

const lines = [
  { code: "FR-D04", name: "Wheat flour", quantity: 9, outlet: "OUT014", stop: 5 },
  { code: "FR-D05", name: "Ceylon black tea", quantity: 9, outlet: "OUT014", stop: 5 },
  { code: "FR-D07", name: "Instant noodles", quantity: 9, outlet: "OUT010", stop: 2 },
  { code: "FR-D08", name: "Cream crackers", quantity: 10, outlet: "OUT010", stop: 2 },
  { code: "FR-D12", name: "Laundry soap bar", quantity: 3, outlet: "OUT010", stop: 2 }
];

export function LoadChecklist() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [flagTarget, setFlagTarget] = useState<(typeof lines)[number] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const complete = checked.size + flagged.size === lines.length;
  const loadedUnits = useMemo(() => lines.filter((line) => checked.has(line.code)).reduce((sum, line) => sum + line.quantity, 0), [checked]);

  function toggleCheck(code: string) {
    setConfirmed(false);
    setChecked((current) => { const next = new Set(current); next.has(code) ? next.delete(code) : next.add(code); return next; });
  }

  function saveFlag() {
    if (!flagTarget) return;
    setChecked((current) => { const next = new Set(current); next.delete(flagTarget.code); return next; });
    setFlagged((current) => new Set(current).add(flagTarget.code));
    setFlagTarget(null);
    setConfirmed(false);
  }

  if (confirmed) return <section className={styles.success}><span>✓</span><h1>VEH012 is loaded</h1><p>The driver can now see this trip. The flag has gone to the Dispatcher and OUT010.</p><dl><div><dt>Trip</dt><dd>VEH012 · Trip 1 · Colombo</dd></div><div><dt>Confirmed</dt><dd>Wed 25 Mar 2026 · 03:52</dd></div><div><dt>Units</dt><dd>{loadedUnits} of {lines.reduce((sum, line) => sum + line.quantity, 0)}</dd></div><div><dt>Flags</dt><dd>{flagged.size} · documented shortfall</dd></div><div><dt>Status</dt><dd>Loaded</dd></div></dl><button onClick={() => setConfirmed(false)}>Back to checklist</button></section>;

  return <section><header className={styles.heading}><div><h1>Loading VEH012 · Trip 1</h1><p>Tick each line as it goes on the truck. Flag anything missing or damaged.</p></div><span>{checked.size + flagged.size} / {lines.length} lines</span></header><div className={styles.layout}><section className={styles.checklist}><aside className={styles.order}>Load in reverse delivery order: the last stop goes in first, the first stop ends up nearest the doors.</aside>{lines.map((line) => <article className={styles.line} key={line.code}><label><input type="checkbox" checked={checked.has(line.code)} disabled={flagged.has(line.code)} onChange={() => toggleCheck(line.code)} /><span><strong>{line.name}</strong><small>{line.code} · Qty {line.quantity} · {line.outlet} · Stop {line.stop}</small></span></label>{flagged.has(line.code) ? <span className={styles.flagged}>Flagged</span> : <button onClick={() => setFlagTarget(line)}>Flag</button>}</article>)}</section><aside className={styles.summary}><h2>VEH012 · Trip 1</h2><dl><div><dt>Departs</dt><dd>04:08</dd></div><div><dt>Area</dt><dd>Colombo · Fresh dry</dd></div><div><dt>Lines</dt><dd>{checked.size + flagged.size} / {lines.length}</dd></div><div><dt>Loaded units</dt><dd>{loadedUnits}</dd></div><div><dt>Flags</dt><dd>{flagged.size}</dd></div></dl><p>You can correct ticks and flags until you confirm the trip.</p><button disabled={!complete} onClick={() => setConfirmed(true)}>Review and confirm</button></aside></div>{flagTarget && <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Flag a problem"><section className={styles.modal}><h2>Flag a problem</h2><p><strong>{flagTarget.name} · {flagTarget.code}</strong><br />{flagTarget.outlet} · planned quantity {flagTarget.quantity}</p><label className={styles.choice}><input type="radio" name="problem" defaultChecked /> Missing <small>Not found at the dock or short in the pick.</small></label><label className={styles.choice}><input type="radio" name="problem" /> Damaged <small>Arrived at the dock damaged; not loaded.</small></label><label>Quantity affected<input type="number" min="1" max={flagTarget.quantity} defaultValue="1" /></label><label>Note (optional)<textarea defaultValue="Outer carton crushed; packs inside are wet." /></label><div className={styles.actions}><button onClick={() => setFlagTarget(null)}>Cancel</button><button className={styles.primary} onClick={saveFlag}>Save flag</button></div></section></div>}</section>;
}
