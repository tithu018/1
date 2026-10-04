"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarClock, CheckCircle2, Clock3, Download, Search, Store, X } from "lucide-react";
import { displayDate, displayTime, label } from "@/lib/format";
import styles from "./deferral-log.module.css";

type Record = { id: string; orderId: string; outlet: string; brand: string; units: number; recorded: string; reason: string; requested: string; status: string };

export function DeferralLog({ records }: { records: Record[] }) {
  const [query, setQuery] = useState(""), [brand, setBrand] = useState("all");
  const filtered = records.filter((record) => (brand === "all" || record.brand === brand) && [record.orderId, record.outlet, record.brand, record.reason, displayDate(record.recorded), displayDate(record.requested)].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  const pending = new Set(records.filter((record) => record.status === "DEFERRED").map((record) => record.orderId)).size;
  function download() {
    const rows = [["Order", "Outlet", "Brand", "Units", "Recorded", "Reason", "Requested date"], ...filtered.map((record) => [record.orderId, record.outlet, label(record.brand), String(record.units), `${displayDate(record.recorded)} ${displayTime(record.recorded)}`, record.reason, displayDate(record.requested)])];
    const csv = rows.map((row) => row.map((cell) => `"${(/^[=+@-]/.test(cell) ? "'" : "") + cell.replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "deferrals.csv"; link.click(); URL.revokeObjectURL(url);
  }
  return <div className={styles.page}>
    <div className={styles.metrics}>{[
      { title: "Recorded deferrals", value: records.length, detail: "All recorded events", icon: Clock3 },
      { title: "Awaiting allocation", value: pending, detail: "Orders still deferred", icon: CalendarClock },
      { title: "Affected outlets", value: new Set(records.map((record) => record.outlet)).size, detail: "Across recorded events", icon: Store }
    ].map(({ title, value, detail, icon: Icon }) => <article key={title}><div className={styles.metricIcon}><Icon size={21} /></div><div><span>{title}</span><strong>{value}</strong><small>{detail}</small></div></article>)}</div>
    <section className={styles.card}><header className={styles.cardHeading}><div><h2><CalendarClock size={21} />Deferral history</h2><p>Recorded reasons and rescheduled orders</p></div><button className={styles.export} onClick={download} disabled={!filtered.length}><Download size={17} />Export CSV</button></header>
      <div className={styles.toolbar}><label className={styles.search}><Search size={18} /><input aria-label="Search deferrals" placeholder="Search order, outlet or reason" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery("")}><X size={16} /></button>}</label><label className={styles.filter}>Brand<select value={brand} onChange={(event) => setBrand(event.target.value)}><option value="all">All brands</option>{["FRESH", "STYLE", "TECH"].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label></div>
      {!filtered.length ? <div className={styles.empty}><div className={styles.emptyIcon}>{records.length ? <Search size={30} /> : <CheckCircle2 size={30} />}</div><h3>{records.length ? "No matching deferrals" : "No deferrals recorded"}</h3><p>{records.length ? "Try another search or brand." : "Orders moved to a later run will appear here."}</p>{records.length ? <button className={styles.reset} onClick={() => { setQuery(""); setBrand("all"); }}>Clear filters</button> : <Link href="/workspace/dispatcher/plan">Open delivery planning<ArrowRight size={16} /></Link>}</div> : <><div className={styles.tableWrap}><table><thead><tr>{["Order / outlet", "Brand", "Units", "Recorded", "Reason", "Requested date"].map((title) => <th key={title}>{title}</th>)}</tr></thead><tbody>{filtered.map((record) => <tr key={record.id}><td><strong>{record.orderId}</strong><small>{record.outlet}</small></td><td><span className={styles.brand} data-brand={record.brand}>{label(record.brand)}</span></td><td>{record.units.toLocaleString()}</td><td>{displayDate(record.recorded)}<small>{displayTime(record.recorded)}</small></td><td className={styles.reason}>{record.reason}</td><td><span className={styles.date}><CalendarClock size={15} />{displayDate(record.requested)}</span></td></tr>)}</tbody></table></div><footer className={styles.footer}>{filtered.length} of {records.length} recorded deferrals</footer></>}
    </section>
  </div>;
}
