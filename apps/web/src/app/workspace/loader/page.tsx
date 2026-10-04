import Link from "next/link";
import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";
import { displayDate, displayTime, label } from "@/lib/format";
import { isFreshUrgent } from "@/lib/loader-workflow";
import { WorkspaceShell } from "@/components/workspace-shell";
import { LoaderQueue, type LoaderQueueTrip } from "./loader-queue";
import styles from "./queue.module.css";

export default async function LoaderQueuePage() {
  const session = await requireRole("loader");
  const plan = session.depotId ? await prisma.plan.findFirst({ where: { depotId: session.depotId, status: "PUBLISHED" }, include: { trips: { include: { vehicle: true, loadSession: true, allocations: { orderBy: { sequence: "asc" } } }, orderBy: [{ plannedStart: "asc" }, { tripNumber: "asc" }] } }, orderBy: [{ serviceDate: "desc" }, { version: "desc" }] }) : null;
  const previous = plan && plan.version > 1 ? await prisma.plan.findFirst({ where: { depotId: plan.depotId, serviceDate: plan.serviceDate, version: { lt: plan.version } }, include: { trips: { include: { allocations: { orderBy: { sequence: "asc" } } } } }, orderBy: { version: "desc" } }) : null;
  const trips: LoaderQueueTrip[] = (plan?.trips ?? []).map((trip) => {
    const prior = previous?.trips.find((entry) => entry.brand === trip.brand && entry.district === trip.district && entry.tripNumber === trip.tripNumber);
    const changed = Boolean(prior && prior.status === "LOADED" && (prior.vehicleId !== trip.vehicleId || prior.allocations.map((entry) => entry.orderId).join("|") !== trip.allocations.map((entry) => entry.orderId).join("|")));
    return { id: trip.id, departure: trip.plannedStart?.toISOString() ?? null, departureLabel: trip.plannedStart ? displayTime(trip.plannedStart) : "Not set", vehicleId: trip.vehicleId, tripNumber: trip.tripNumber, district: trip.district, brand: label(trip.brand), stops: trip.allocations.length, temperature: trip.vehicle.temperature === "REEFER" ? "Chilled · reefer check" : "Ambient", status: trip.status, loading: trip.loadSession?.status === "LOADING", changed, urgent: isFreshUrgent(trip.brand, trip.plannedStart) };
  });
  const changedTrips = trips.filter((trip) => trip.changed);
  return <WorkspaceShell role="loader" active="Trip queue"><section className={styles.queue}>
    <header className={styles.heading}><h1>Trip queue</h1><p>{plan ? `${displayDate(plan.serviceDate)} · Plan v${plan.version} · earliest departures first` : "No published plan for your depot"}</p></header>
    {plan && plan.version > 1 && <section className={styles.change}><div className={styles.changeCopy}><b>! Published plan updated{changedTrips.length ? ` · ${changedTrips[0].district} trip` : ""}</b><span>{changedTrips.length ? `${changedTrips[0].vehicleId} needs re-verification before Driver hand-off.` : "Review the current sequence before loading."}</span></div><Link href="/workspace/loader/change">View change</Link></section>}
    <div className={styles.metrics}>{[[trips.length, "Trips today", "Depot queue"], [trips.filter((trip) => trip.status === "LOADED").length, "Loaded", "Handed to drivers"], [trips.filter((trip) => trip.loading).length, "Loading", "In progress"], [changedTrips.length, "Plan changed", "Needs re-verification"], [trips.filter((trip) => trip.status === "ALLOCATED" && !trip.loading).length, "Not started", "Ready at dock"]].map(([count, title, caption]) => <article className={title === "Plan changed" && Number(count) ? styles.warningMetric : ""} key={title}><strong>{count}</strong><b>{title}</b><span>{caption}</span></article>)}</div>
    <LoaderQueue trips={trips} />
  </section></WorkspaceShell>;
}
