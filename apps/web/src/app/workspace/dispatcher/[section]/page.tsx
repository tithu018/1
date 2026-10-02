import { notFound } from "next/navigation";
import { prisma } from "@waypoint/database";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/lib/auth";
import styles from "./section.module.css";

type Row = readonly string[];

const liveTrips: Row[] = [
  ["TRIP-250325-01", "VEH012", "Fresh · Colombo", "5", "03:40", "Loading", "On time"],
  ["TRIP-250325-02", "VEH018", "Fresh · Gampaha", "4", "03:46", "Ready", "On time"],
  ["TRIP-250325-03", "VEH004", "Style · Colombo", "6", "04:05", "Ready", "On time"],
  ["TRIP-250325-04", "VEH009", "Fresh · Kalutara", "7", "03:53", "Re-verifying", "Plan changed"],
  ["TRIP-250325-05", "VEH021", "Tech · Colombo", "5", "04:20", "Not started", "On time"]
];

const deferrals: Row[] = [
  ["ORD0096654", "OUT010", "Fresh · Chilled", "40", "Tue 24 Mar", "Capacity full", "Wed 25 Mar"],
  ["ORD0096518", "OUT010", "Fresh · Chilled", "40", "Mon 23 Mar", "Reefer unavailable", "Tue 24 Mar"],
  ["ORD0096621", "OUT023", "Style · Dry", "28", "Tue 24 Mar", "Window conflict", "Wed 25 Mar"],
  ["ORD0096488", "OUT037", "Tech · Dry", "34", "Mon 23 Mar", "Vehicle access", "Tue 24 Mar"]
];

const vehicles: Row[] = [
  ["VEH004", "Ambient truck", "4,800 kg", "26 m³", "Available"],
  ["VEH009", "Ambient truck", "5,800 kg", "30 m³", "Available"],
  ["VEH012", "Reefer truck", "3,600 kg", "20 m³", "Loading"],
  ["VEH018", "Ambient van", "1,800 kg", "12 m³", "Available"],
  ["VEH021", "Ambient truck", "4,200 kg", "24 m³", "Available"],
  ["VEH025", "Ambient truck", "3,800 kg", "22 m³", "Out of service"]
];

function statusClass(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("out of service") || lower.includes("attention") || lower.includes("changed")) return `${styles.badge} ${styles.critical}`;
  if (lower.includes("loading") || lower.includes("review") || lower.includes("re-verifying") || lower.includes("deferred")) return `${styles.badge} ${styles.warning}`;
  return `${styles.badge} ${styles.success}`;
}

function Heading({ title, subtitle, action }: Readonly<{ title: string; subtitle: string; action?: React.ReactNode }>) {
  return <header className={styles.heading}><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</header>;
}

function Table({ headers, rows, highlightLast = false }: Readonly<{ headers: string[]; rows: Row[]; highlightLast?: boolean }>) {
  return <div className={styles.tableWrap}><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`}><td><strong>{row[0]}</strong></td>{row.slice(1).map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{highlightLast && cellIndex === row.length - 2 ? <span className={statusClass(cell)}>{cell}</span> : cell}</td>)}</tr>)}</tbody></table></div>;
}

function LiveBoard() {
  return <section className={styles.page}><Heading title="Live Board" subtitle="Plan v2 · Wed 25 Mar 2026 · Peliyagoda depot" action={<span className={`${styles.badge} ${styles.success}`}>● Live</span>} /><div className={styles.metrics}><article><small>TRIPS</small><strong>5</strong><span>29 planned stops</span></article><article><small>LOADING</small><strong>1</strong><span>VEH012 at dock</span></article><article><small>READY</small><strong>2</strong><span>Awaiting departure</span></article><article className={styles.metricAlert}><small>NEEDS ATTENTION</small><strong>1</strong><span>Vehicle replacement</span></article></div><section className={styles.card}><div className={styles.cardTitle}><h2>Today’s trips</h2><span>Last updated 04:11</span></div><Table headers={["Trip", "Vehicle", "Route", "Stops", "Departs", "Loading status", "Plan health"]} rows={liveTrips} highlightLast /></section></section>;
}

function Attention({ issueRows }: Readonly<{ issueRows: Row[] }>) {
  const rows = issueRows.length ? issueRows : [["ISS-0417", "ORD0096653", "OUT010", "2 units short (dry)", "Resolved", "Store receipt"], ["ISS-0421", "ORD0096797", "OUT010", "1 carton damaged at loading", "Reported", "Loader"], ["VEH025", "TRIP-250325-04", "Kalutara", "Vehicle out of service", "Needs decision", "Fleet"]];
  return <section className={styles.page}><Heading title="Needs Attention" subtitle="Issues and planning exceptions that need a decision" action={<span className={`${styles.badge} ${styles.critical}`}>{rows.length} open</span>} /><div className={styles.metrics}><article className={styles.metricAlert}><small>OPEN ITEMS</small><strong>{rows.length}</strong><span>Across today’s plan</span></article><article><small>DELIVERY ISSUES</small><strong>2</strong><span>Store and loading</span></article><article><small>VEHICLE ISSUES</small><strong>1</strong><span>Replacement assigned</span></article><article><small>OLDEST</small><strong>23 min</strong><span>Within response target</span></article></div><section className={styles.card}><h2>Attention queue</h2><Table headers={["Case", "Entity", "Outlet / route", "Problem", "Status", "Source"]} rows={rows} highlightLast /><p className={styles.caption}>Open an issue to review its audit trail, message the outlet, or record a resolution.</p></section></section>;
}

function DeferralLog() {
  return <section className={styles.page}><Heading title="Deferral Log" subtitle="Every deferred order, its reason and the date it moved to" /><section className={styles.notice}><strong>2 consecutive chilled deferrals for OUT010</strong><span>Review reefer capacity before publishing the next plan.</span></section><section className={styles.card}><div className={styles.cardTitle}><h2>Recent deferrals</h2><button type="button">Export CSV</button></div><Table headers={["Order", "Outlet", "Brand · type", "Units", "Original date", "Reason", "Moved to"]} rows={deferrals} /></section></section>;
}

function Capacity() {
  return <section className={styles.page}><Heading title="Capacity Forecast" subtitle="Demand against available fleet · Wed 25 Mar 2026" /><div className={styles.metrics}><article><small>AMBIENT WEIGHT</small><strong>71%</strong><span>13,840 of 19,400 kg</span><i><b style={{ width: "71%" }} /></i></article><article className={styles.metricAlert}><small>CHILLED WEIGHT</small><strong>92%</strong><span>3,310 of 3,600 kg</span><i><b style={{ width: "92%" }} /></i></article><article><small>AMBIENT VOLUME</small><strong>64%</strong><span>60.2 of 94 m³</span><i><b style={{ width: "64%" }} /></i></article><article><small>UNALLOCATED</small><strong>2</strong><span>Orders need review</span></article></div><section className={styles.card}><h2>Vehicle capacity</h2><Table headers={["Vehicle", "Type", "Weight capacity", "Volume capacity", "Status"]} rows={vehicles} highlightLast /></section><section className={styles.card}><h2>Planning note</h2><p className={styles.caption}>Chilled capacity is close to the hard limit. The allocator never mixes temperature classes or splits an order across vehicles.</p></section></section>;
}

function ReferenceData() {
  const outlets: Row[] = [["OUT010", "Fresh", "Colombo", "05:00–07:30", "Rear dock", "Normal"], ["OUT008", "Fresh", "Colombo", "04:30–07:00", "Street", "Van preferred"], ["OUT023", "Style", "Gampaha", "05:15–08:00", "Mall dock", "Book slot"], ["OUT037", "Tech", "Kalutara", "06:00–09:00", "Rear dock", "Truck access"]];
  return <section className={styles.page}><Heading title="Reference Data" subtitle="Vehicles, outlets and constraints used by the assisted planner" /><section className={styles.card}><h2>Vehicles</h2><Table headers={["Vehicle", "Type", "Weight capacity", "Volume capacity", "Status"]} rows={vehicles} highlightLast /></section><section className={styles.card}><h2>Outlets</h2><Table headers={["Outlet", "Brand", "District", "Window", "Dock", "Access"]} rows={outlets} /></section></section>;
}

export default async function DispatcherSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!["board", "attention", "deferrals", "capacity", "reference"].includes(section)) notFound();
  const session = await requireRole("dispatcher");
  if (!session.depotId) notFound();
  const issues = await prisma.issueCase.findMany({ where: { order: { outlet: { depotId: session.depotId } } }, include: { order: true }, orderBy: { updatedAt: "desc" }, take: 20 });
  const issueRows: Row[] = issues.map((issue) => [issue.id, issue.orderId, issue.order.outletId, issue.summary, issue.status.replaceAll("_", " "), "Shared record"]);
  const title = section === "board" ? "Live Board" : section === "attention" ? "Needs Attention" : section === "deferrals" ? "Deferral Log" : section === "capacity" ? "Capacity Forecast" : "Reference Data";
  return <WorkspaceShell role="dispatcher" active={title}>{section === "board" ? <LiveBoard /> : section === "attention" ? <Attention issueRows={issueRows} /> : section === "deferrals" ? <DeferralLog /> : section === "capacity" ? <Capacity /> : <ReferenceData />}</WorkspaceShell>;
}
