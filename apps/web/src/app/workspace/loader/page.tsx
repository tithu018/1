import Link from "next/link";
import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";
import { displayDate, displayTime, label } from "@/lib/format";
import { WorkspaceShell } from "@/components/workspace-shell";
import styles from "./queue.module.css";

export default async function LoaderQueuePage() {
  const session = await requireRole("loader");
  const plan = session.depotId ? await prisma.plan.findFirst({ where: { depotId: session.depotId, status: "PUBLISHED" }, include: { trips: { include: { vehicle: true, allocations: true }, orderBy: { plannedStart: "asc" } } }, orderBy: [{ serviceDate: "desc" }, { version: "desc" }] }) : null;
  const trips = plan?.trips ?? [];
  return <WorkspaceShell role="loader" active="Trip queue"><section className={styles.queue}>
    <header className={styles.heading}><h1>Trip queue</h1><p>{plan ? `${displayDate(plan.serviceDate)} · Plan v${plan.version}` : "No published plan for your depot"}</p></header>
    {plan && plan.version > 1 && <section className={styles.change}><div className={styles.changeCopy}><b>Published plan updated</b><span>Review the latest stop sequence before loading.</span></div><Link href="/workspace/loader/change">View change</Link></section>}
    <div className={styles.metrics}>{[[trips.length, "Trips"], [trips.filter((trip) => trip.status === "LOADED").length, "Loaded"], [trips.filter((trip) => trip.status === "ALLOCATED").length, "Awaiting loading"]].map(([count, title]) => <article key={title}><strong>{count}</strong><b>{title}</b></article>)}</div>
    <section className={styles.tableCard}><table><thead><tr><th>Departs</th><th>Vehicle</th><th>Trip</th><th>Stops</th><th>Temperature</th><th>Status</th><th /></tr></thead><tbody>{trips.map((trip) => <tr key={trip.id}><td>{trip.plannedStart ? displayTime(trip.plannedStart) : "Not set"}</td><td>{trip.vehicleId}</td><td>{trip.tripNumber} · {trip.district}</td><td>{trip.allocations.length}</td><td>{label(trip.vehicle.temperature)}</td><td>{label(trip.status)}</td><td><Link href={`/workspace/loader/load?trip=${encodeURIComponent(trip.id)}`}>Open</Link></td></tr>)}</tbody></table>{!trips.length && <p>Trips will appear when the dispatcher publishes a plan.</p>}</section>
  </section></WorkspaceShell>;
}
