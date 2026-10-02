import Link from "next/link";
import { notFound } from "next/navigation";
import { type UserRole, userRoles } from "@waypoint/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import styles from "./workspace.module.css";

function isRole(value: string): value is UserRole {
  return userRoles.includes(value as UserRole);
}

export default async function WorkspacePage({ params }: { params: Promise<{ role: string }> }) {
  const { role: rawRole } = await params;
  if (!isRole(rawRole)) notFound();
  if (rawRole === "store_manager") return <StoreDashboard />;
  if (rawRole === "dispatcher") return <DispatcherDashboard />;
  if (rawRole === "loader") return <WorkspaceShell role="loader" active="Trip queue"><section /></WorkspaceShell>;
  return <DriverDashboard />;
}

function StoreDashboard() {
  return (
    <WorkspaceShell role="store_manager" active="Dashboard">
      <section className={styles.storePage}>
        <header className={styles.title}>
          <h1>Dashboard</h1>
          <p>Tue 24 Mar 2026 - 15:40</p>
        </header>
        <div className={styles.storeCards}>
          <article>
            <small>NEXT ORDER CUTOFF</small>
            <strong>20 min</strong>
            <span>Orders for Wed 25 Mar close at 16:00.</span>
            <Link href="/workspace/store_manager/orders">Place order</Link>
          </article>
          <article>
            <small>NEXT PLANNED ARRIVAL</small>
            <b>Wed 25 Mar - 05:00-07:30</b>
            <span>Chilled orders ORD0096518 and ORD0096654 plus your dry order once submitted.</span>
            <em>△ Deferred → Wed 25 Mar</em>
          </article>
          <article>
            <small>AWAITING YOUR CONFIRMATION</small>
            <b>ORD0096653 - Dry</b>
            <span>Delivered today. 44 units expected - the loader flagged a shortfall before departure.</span>
            <footer>
              <em>✓ Delivered</em>
              <Link href="/workspace/store_manager/receive">Confirm receipt</Link>
            </footer>
          </article>
        </div>
        <section className={styles.attention}>
          <h2>Needs your attention</h2>
          <Alert title="Chilled orders deferred two days in a row" detail="ORD0096518 (Mon 23) and ORD0096654 (Tue 24) were both deferred. Both arrive Wed 25 Mar with priority." action="View deferral" />
          <Alert title="Shortfall expected on ORD0096653" detail="The loader flagged 2 units short before the truck left. Check this when you confirm receipt." action="View order" href="/workspace/store_manager/receive" />
        </section>
        <div className={styles.lowerGrid}>
          <section>
            <h2>Recent issue</h2>
            <p><span>✓</span> <b>No open issues</b><br />Issues you report when confirming receipt appear here with their status.</p>
          </section>
          <section>
            <h2>Planning ahead</h2>
            <p><b>Wed 25 Mar is a payday</b><br />Consider payday demand when you place the next order.</p>
            <p><b>Sinhala & Tamil New Year</b><br />No deliveries Sun 12 - Tue 14 Apr. Demand builds from Sat 4 Apr.</p>
          </section>
        </div>
      </section>
    </WorkspaceShell>
  );
}

function DispatcherDashboard() {
  const rows = [
    ["ORD0096515", "OUT008", "Fresh - Chilled", "33", "253.7 kg", "05:00-07:30", "2 days in a row"],
    ["ORD0096650", "OUT008", "Fresh - Chilled", "31", "232.7 kg", "05:00-07:30", "2 days in a row"],
    ["ORD0096518", "OUT010", "Fresh - Chilled", "40", "264.5 kg", "05:00-07:30", "2 days in a row"],
    ["ORD0096654", "OUT010", "Fresh - Chilled", "40", "293.5 kg", "05:00-07:30", "2 days in a row"],
    ["ORD0096520", "OUT011", "Fresh - Chilled", "36", "249.9 kg", "03:00-08:00", "2 days in a row"],
    ["ORD0096647", "OUT006", "Fresh - Chilled", "66", "534.0 kg", "03:00-08:00", "Rolled over"],
    ["ORD0096815", "OUT031", "Fresh - Chilled", "210", "1,183.9 kg", "03:00-08:00", "Unusual quantity"],
    ["ORD0096797", "OUT010", "Fresh - Dry", "45", "359.0 kg", "05:00-07:30", "New"],
    ["ORD0096821", "OUT035", "Style - Ambient", "40", "657.5 kg", "Mall 10:30-12:30", "Mall dock"]
  ];

  return (
    <WorkspaceShell role="dispatcher" active="Plan">
      <section className={styles.dispatchPage}>
        <header className={styles.title}>
          <h1>Order queue - Wed 25 Mar</h1>
          <p>Peliyagoda - Queue closed at 16:00 on Tue 24 Mar - all confirmed orders in one place</p>
        </header>
        <div className={styles.dispatchMetrics}>
          <Metric value="90" label="Orders" detail="87 Fresh - 3 Style" />
          <Metric value="80" label="New" detail="Submitted before 16:00" />
          <Metric value="10" label="Rolled over" detail="Deferred earlier - priority" />
          <Metric value="4" label="Protected outlets" detail="Deferred 2 days in a row" />
          <Metric value="1" label="Unusual quantity" detail="1.6x the outlet usual" />
        </div>
        <section className={styles.queueCard}>
          <div className={styles.filters}>
            {["All", "Rolled over", "Protected", "Chilled", "Style & Tech", "Flags"].map((filter, index) => <button className={index === 0 ? styles.selected : ""} key={filter}>{filter}</button>)}
          </div>
          <table>
            <thead>
              <tr><th>Order</th><th>Outlet</th><th>Brand - temp</th><th>Units</th><th>Weight</th><th>Window</th><th>Flags</th></tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr className={index < 5 ? styles.priorityRow : ""} key={row[0]}>
                  {row.map((cell, cellIndex) => <td key={cell}>{cellIndex === 6 ? <span>{cell}</span> : cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <footer>
            <p>Showing 13 of 90 orders - priority first</p>
            <Link href="/workspace/dispatcher/plan">Generate assisted plan</Link>
          </footer>
        </section>
      </section>
    </WorkspaceShell>
  );
}

function DriverDashboard() {
  return (
    <WorkspaceShell role="driver" active="Today">
      <section className={styles.driverToday}>
        <h1>Today</h1>
        <section className={styles.tripSummary}>
          <header><h2>Trip 1 - Colombo</h2><span>✓ Loaded</span></header>
          <dl>
            <div><dt>Vehicle</dt><dd>VEH012 - ambient truck</dd></div>
            <div><dt>Departs</dt><dd>04:08</dd></div>
            <div><dt>Stops</dt><dd>5 - 216 units</dd></div>
            <div><dt>Loaded</dt><dd>03:52 at Peliyagoda</dd></div>
          </dl>
        </section>
        <aside className={styles.driverNote}><b>ⓘ Loader note - OUT010</b><p>1 carton of Instant noodles was damaged and not loaded. The store already knows.</p></aside>
        <ol className={styles.mobileStops}>
          {["OUT008", "OUT010", "OUT009", "OUT011", "OUT014"].map((stop, index) => (
            <li key={stop}><span>{index + 1}</span><strong>{stop}</strong><small>Window {index === 1 ? "05:00-07:30" : index === 2 ? "04:00-07:45" : "03:00-08:00"}</small><b>{["04:34", "04:57", "05:19", "05:43", "06:05"][index]}</b></li>
          ))}
        </ol>
        <Link className={styles.startTrip} href="/workspace/driver/trip">Start trip</Link>
      </section>
    </WorkspaceShell>
  );
}

function Metric({ value, label, detail }: Readonly<{ value: string; label: string; detail: string }>) {
  return <article><strong>{value}</strong><b>{label}</b><span>{detail}</span></article>;
}

function Alert({ title, detail, action, href = "#" }: Readonly<{ title: string; detail: string; action: string; href?: string }>) {
  return <article className={styles.alert}><div><strong>△ {title}</strong><p>{detail}</p></div><Link href={href}>{action}</Link></article>;
}
