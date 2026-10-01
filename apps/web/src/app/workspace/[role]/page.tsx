import { demoOrders, demoOutlet, type UserRole, userRoles } from "@waypoint/domain";
import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import styles from "./workspace.module.css";

function isRole(value: string): value is UserRole { return userRoles.includes(value as UserRole); }

export default async function WorkspacePage({ params }: { params: Promise<{ role: string }> }) {
  const { role: rawRole } = await params;
  if (!isRole(rawRole)) notFound();
  const role = rawRole;
  if (role === "store_manager") return <StoreDashboard />;
  if (role === "dispatcher") return <DispatcherDashboard />;
  if (role === "loader") return <LoaderDashboard />;
  return <DriverDashboard />;
}

function StoreDashboard() {
  return <WorkspaceShell role="store_manager" active="Dashboard"><section className={styles.title}><p>Dashboard</p><span>Tue 24 Mar 2026 · 15:40</span></section><div className={styles.cards}><Metric label="NEXT ORDER CUTOFF" value="20 min" detail="Orders for Wed 25 Mar close at 16:00." /><Metric label="NEXT PLANNED ARRIVAL" value="Wed 25 Mar" detail="05:00–07:30" /><Metric label="AWAITING YOUR CONFIRMATION" value="ORD0096653 · Dry" detail="Delivered today. 44 units expected." /></div><section className={styles.panel}><h2>Needs your attention</h2><Alert title="Chilled orders deferred two days in a row" detail="ORD0096518 and ORD0096654 arrive Wed 25 Mar with priority." /><Alert title="Shortfall expected on ORD0096653" detail="The loader flagged 2 units short before the truck left." /></section><section className={styles.splitGrid}><section className={styles.panel}><h2>Recent issue</h2><p className={styles.muted}>No open issues. Issues reported when confirming receipt appear here with their status.</p></section><section className={styles.panel}><h2>Planning ahead</h2><p className={styles.muted}>Wed 25 Mar is a payday. Consider payday demand when you place tomorrow’s order.</p></section></section></WorkspaceShell>;
}

function DispatcherDashboard() {
  return <WorkspaceShell role="dispatcher" active="Plan"><section className={styles.title}><p>Order queue · Wed 25 Mar</p><span>Queue closed at 16:00 · all confirmed orders in one place</span></section><div className={styles.cards}><Metric label="ORDERS" value="90" detail="87 Fresh · 3 Style" /><Metric label="NEW" value="80" detail="Submitted before 16:00" /><Metric label="ROLLED OVER" value="10" detail="Deferred earlier · priority" /><Metric label="PROTECTED OUTLETS" value="4" detail="Deferred two days in a row" /></div><section className={styles.panel}><div className={styles.panelHeading}><h2>Priority order queue</h2><button>Generate assisted plan</button></div><table><thead><tr><th>Order</th><th>Outlet</th><th>Brand · temp</th><th>Units</th><th>Weight</th><th>Window</th><th>Flags</th></tr></thead><tbody>{demoOrders.map((order) => <tr key={order.id}><td>{order.id}</td><td>{order.outletId}</td><td>Fresh · {order.kind === "Chilled" ? "Chilled" : "Ambient"}</td><td>{order.units}</td><td>{order.weightKg} kg</td><td>{order.deliveryWindow}</td><td>{order.status === "deferred" ? "Rolled over" : "New"}</td></tr>)}</tbody></table></section></WorkspaceShell>;
}

function LoaderDashboard() {
  return <WorkspaceShell role="loader" active="Trip queue"><section className={styles.title}><p>Trip queue</p><span>Wed 25 Mar 2026 · plan v2 · earliest departures first</span></section><Alert title="Plan changed at 03:08 · Kalutara trip" detail="VEH025 is out of service. The trip moves to VEH009. Re-verify before departure." /><div className={styles.cards}><Metric label="TRIPS TODAY" value="22" detail="Peliyagoda" /><Metric label="LOADED" value="5" detail="Handed to drivers" /><Metric label="LOADING" value="1" detail="VEH001" /><Metric label="PLAN CHANGED" value="1" detail="Needs re-verification" /></div><section className={styles.panel}><h2>Trips today</h2><table><thead><tr><th>Departs</th><th>Vehicle</th><th>Trip</th><th>Stops</th><th>Temperature</th><th>Status</th></tr></thead><tbody><tr><td>02:00</td><td>VEH007</td><td>Trip 1 · Puttalam</td><td>1</td><td>Chilled</td><td>Loaded</td></tr><tr><td>03:53</td><td>VEH009</td><td>Trip 1 · Kalutara</td><td>7</td><td>Ambient</td><td>Plan changed</td></tr><tr><td>04:08</td><td>VEH012</td><td>Trip 1 · Colombo</td><td>5</td><td>Ambient</td><td>Not started</td></tr></tbody></table></section></WorkspaceShell>;
}

function DriverDashboard() {
  return <WorkspaceShell role="driver" active="Today"><section className={styles.driverTitle}><p>Today</p><span>Loaded</span></section><section className={styles.driverCard}><h2>Trip 1 · Colombo</h2><p>Vehicle <strong>VEH012 · ambient truck</strong></p><dl><div><dt>Departs</dt><dd>04:08</dd></div><div><dt>Stops</dt><dd>5 · 216 units</dd></div><div><dt>Loaded</dt><dd>03:52 at Peliyagoda</dd></div></dl></section><Alert title="Loader note · OUT010" detail="1 carton of Instant noodles was damaged and not loaded. The store already knows." /><ol className={styles.stopList}>{["OUT008", "OUT010", "OUT009", "OUT011", "OUT014"].map((stop, index) => <li key={stop}><span>{index + 1}</span><strong>{stop}</strong><small>{["04:34", "04:57", "05:19", "05:43", "06:05"][index]} · Window {demoOutlet.deliveryWindow}</small></li>)}</ol><button className={styles.fullButton}>Start trip</button></WorkspaceShell>;
}

function Metric({ label, value, detail }: Readonly<{ label: string; value: string; detail: string }>) { return <section className={styles.metric}><small>{label}</small><strong>{value}</strong><span>{detail}</span></section>; }
function Alert({ title, detail }: Readonly<{ title: string; detail: string }>) { return <aside className={styles.alert}><span>△</span><div><strong>{title}</strong><p>{detail}</p></div></aside>; }
