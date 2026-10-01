"use client";

import { useMemo, useState } from "react";
import styles from "./receipt-confirmation.module.css";

const items = [
  { code: "FR-D01", name: "Basmati rice", expected: 2 },
  { code: "FR-D02", name: "Red lentils (dhal)", expected: 2 },
  { code: "FR-D04", name: "Wheat flour", expected: 9 },
  { code: "FR-D07", name: "Instant noodles", expected: 10 },
  { code: "FR-D08", name: "Cream crackers", expected: 10 },
  { code: "FR-D11", name: "Bottled water", expected: 1 },
  { code: "FR-D13", name: "Toilet tissue", expected: 2 }
];

export function ReceiptConfirmation() {
  const [arrivalConfirmed, setArrivalConfirmed] = useState(false);
  const [received, setReceived] = useState<Record<string, number>>(() => Object.fromEntries(items.map((item) => [item.code, item.expected])));
  const [outcome, setOutcome] = useState<"full" | "short" | "reservation">("short");
  const [recorded, setRecorded] = useState(false);
  const totalExpected = items.reduce((total, item) => total + item.expected, 0);
  const totalReceived = useMemo(() => Object.values(received).reduce((total, value) => total + value, 0), [received]);
  const hasShortfall = totalReceived < totalExpected || outcome !== "full";

  if (recorded) return <section className={styles.success}><span>✓</span><h1>Receipt recorded</h1><p>The Dispatcher can now see your confirmation and the reported shortfall.</p><dl><div><dt>Order</dt><dd>ORD0096653</dd></div><div><dt>Recorded</dt><dd>Tue 24 Mar 2026 · 15:45</dd></div><div><dt>Received</dt><dd>{totalReceived} of {totalExpected} units</dd></div><div><dt>Issue opened</dt><dd>{hasShortfall ? "ISS-0417" : "None"}</dd></div><div><dt>Issue status</dt><dd>{hasShortfall ? "Reported" : "—"}</dd></div></dl><button onClick={() => setRecorded(false)}>Back to receipt</button></section>;

  if (!arrivalConfirmed) return <section className={styles.arrival}><header><h1>Did the delivery arrive?</h1><p>Step 1 of 2 · ORD0096653 · Dry (ambient)</p></header><section><h2>Delivery</h2><dl><div><dt>Delivered by</dt><dd>VEH022 · marked delivered at 04:44</dd></div><div><dt>Expected</dt><dd>{totalExpected} units · {items.length} products</dd></div><div><dt>Loader note</dt><dd>Cream crackers (FR-D08): 2 cartons short</dd></div></dl></section><aside>Confirm arrival first. Next you’ll check each product and report anything missing or damaged.</aside><button onClick={() => setArrivalConfirmed(true)}>Confirm arrival</button><button className={styles.secondary}>It hasn’t arrived</button></section>;

  return <section><header className={styles.heading}><div><h1>Confirm receipt</h1><p>Step 2 of 2 · ORD0096653 · Dry (ambient) · Delivered Tue 24 Mar</p></div><aside><strong>Expected</strong><span>{totalExpected} units · {items.length} products</span><strong>Received</strong><span>{totalReceived} units</span></aside></header><section className={styles.shortfall}><strong>△ Expected shortfall</strong><p>The loader flagged 2 cartons of Cream crackers (FR-D08) short before the truck left.</p></section><section className={styles.choices}><h2>What did you receive?</h2><label className={outcome === "full" ? styles.selected : ""}><input type="radio" checked={outcome === "full"} onChange={() => setOutcome("full")} /> <span><strong>Received in full</strong><small>Every product arrived in the expected quantity, with no damage.</small></span></label><label className={outcome === "short" ? styles.selected : ""}><input type="radio" checked={outcome === "short"} onChange={() => setOutcome("short")} /> <span><strong>Received short or damaged</strong><small>Some units are missing or damaged. An issue will be opened.</small></span></label><label className={outcome === "reservation" ? styles.selected : ""}><input type="radio" checked={outcome === "reservation"} onChange={() => setOutcome("reservation")} /> <span><strong>Accept with reservation</strong><small>Accept the delivery but record a concern, such as damaged packaging.</small></span></label></section><section className={styles.table}><h2>Check each product</h2>{items.map((item) => <article key={item.code}><div><strong>{item.name} · {item.code}</strong><span>Expected {item.expected}</span></div><label>Received <input type="number" min="0" max={item.expected} value={received[item.code]} onChange={(event) => setReceived((current) => ({ ...current, [item.code]: Math.max(0, Math.min(item.expected, Number(event.target.value) || 0)) }))} /></label><b className={received[item.code] < item.expected ? styles.isShort : ""}>{received[item.code] < item.expected ? `Short ${item.expected - received[item.code]}` : "OK"}</b></article>)}</section><section className={styles.evidence}><h2>Note and photo</h2><textarea defaultValue="2 cartons of Cream crackers missing — matches the loader’s flag." /><button type="button">Add photo</button><p>A photo, a note, or both. A photo helps when goods are damaged.</p></section><button className={styles.primary} onClick={() => setRecorded(true)}>Confirm receipt</button></section>;
}
