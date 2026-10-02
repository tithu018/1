import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@waypoint/database";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/lib/auth";
import { displayDate, displayTime, label } from "@/lib/format";
import styles from "./section.module.css";
import { DataTable } from "@/components/data-table";

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return <div className={styles.tableWrap}><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table>{!rows.length && <p className={styles.caption}>No records to display.</p>}</div>;
}

export default async function DispatcherSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const titles: Record<string, string> = { board: "Live Board", attention: "Needs Attention", deferrals: "Deferral Log", capacity: "Capacity Forecast", reference: "Reference Data" };
  if (!titles[section]) notFound();
  const session = await requireRole("dispatcher");
  if (!session.depotId) notFound();
  const [vehicles, outlets, orders, issues, plan, events] = await Promise.all([
    prisma.vehicle.findMany({ where: { depotId: session.depotId }, orderBy: { id: "asc" } }),
    prisma.outlet.findMany({ where: { depotId: session.depotId }, orderBy: { id: "asc" } }),
    prisma.order.findMany({ where: { outlet: { depotId: session.depotId }, status: { in: ["SUBMITTED", "CONFIRMED", "DEFERRED"] } } }),
    prisma.issueCase.findMany({ where: { order: { outlet: { depotId: session.depotId } }, status: { not: "RESOLVED" } }, include: { order: true }, orderBy: { updatedAt: "desc" } }),
    prisma.plan.findFirst({ where: { depotId: session.depotId, status: "PUBLISHED" }, include: { trips: { include: { allocations: true } } }, orderBy: [{ serviceDate: "desc" }, { version: "desc" }] }),
    prisma.orderStatusEvent.findMany({ where: { status: "DEFERRED", order: { outlet: { depotId: session.depotId } } }, include: { order: { include: { outlet: true } } }, orderBy: { createdAt: "desc" } })
  ]);
  const vehicleRows = vehicles.map((vehicle) => [vehicle.id, `${label(vehicle.temperature)} ${label(vehicle.type)}`, `${vehicle.weightCapacityKg} kg`, `${vehicle.volumeCapacityM3} m³`, vehicle.isInWorkshop ? "In workshop" : "Available"]);
  const demand = orders.reduce((sum, order) => sum + Number(order.weightKg), 0);
  const capacity = vehicles.filter((vehicle) => !vehicle.isInWorkshop).reduce((sum, vehicle) => sum + Number(vehicle.weightCapacityKg), 0);
  const thermalMetrics = (["AMBIENT", "REEFER"] as const).flatMap((temperature) => {
    const queued = orders.filter((order) => order.temperatureRequired === temperature);
    const fleet = vehicles.filter((vehicle) => vehicle.temperature === temperature && !vehicle.isInWorkshop);
    return [
      { title: `${temperature === "REEFER" ? "Chilled" : "Ambient"} weight`, demand: queued.reduce((sum, order) => sum + Number(order.weightKg), 0), capacity: fleet.reduce((sum, vehicle) => sum + Number(vehicle.weightCapacityKg), 0), unit: "kg" },
      { title: `${temperature === "REEFER" ? "Chilled" : "Ambient"} volume`, demand: queued.reduce((sum, order) => sum + Number(order.volumeM3), 0), capacity: fleet.reduce((sum, vehicle) => sum + Number(vehicle.volumeCapacityM3), 0), unit: "m³" }
    ];
  });
  return <WorkspaceShell role="dispatcher" active={titles[section]}><section className={styles.page}>
    <header className={styles.heading}><div><h1>{titles[section]}</h1><p>{session.depotId} · {plan ? `${displayDate(plan.serviceDate)} · Plan v${plan.version}` : "No published plan"}</p></div><Link href="/workspace/dispatcher/registration">Register store manager</Link></header>
    {section === "board" && <section className={styles.card}><h2>Published trips</h2><Table headers={["Trip", "Vehicle", "Brand", "District", "Stops", "Planned start", "Status"]} rows={plan?.trips.map((trip) => [trip.id, trip.vehicleId, label(trip.brand), trip.district, trip.allocations.length, trip.plannedStart ? displayTime(trip.plannedStart) : "Not set", label(trip.status)]) ?? []} /></section>}
    {section === "attention" && <section className={styles.card}><h2>{issues.length} open issues</h2><Table headers={["Case", "Order", "Outlet", "Problem", "Status"]} rows={issues.map((issue) => [<Link key={issue.id} href={`/workspace/dispatcher/issues/${issue.id}`}>{issue.id}</Link>, issue.orderId, issue.order.outletId, issue.summary, label(issue.status)])} /></section>}
    {section === "deferrals" && <section className={styles.card}><h2>Recorded deferrals</h2><div className={styles.tableWrap}><DataTable exportName="deferrals" headers={["Order", "Outlet", "Brand", "Units", "Recorded", "Reason", "Requested date"]} rows={events.map((event) => [event.orderId, event.order.outletId, label(event.order.outlet.brand), String(event.order.units), displayDate(event.createdAt), event.reason ?? "Not recorded", displayDate(event.order.requestedDate)])} /></div></section>}
    {section === "capacity" && <><div className={styles.metrics}><article><small>QUEUED DEMAND</small><strong>{demand.toLocaleString()} kg</strong><span>{orders.length} orders</span></article><article><small>AVAILABLE WEIGHT CAPACITY</small><strong>{capacity.toLocaleString()} kg</strong><span>{vehicles.filter((vehicle) => !vehicle.isInWorkshop).length} vehicles</span></article><article><small>WEIGHT PRESSURE</small><strong>{capacity ? `${Math.round(demand / capacity * 100)}%` : "No capacity"}</strong><span>Queued demand against current fleet</span></article></div><p className={styles.caption}>This is a current queue estimate. Temperature, volume, access and route constraints are checked in the planner.</p></>}
    {(section === "capacity" || section === "reference") && <section className={styles.card}><h2>Vehicles</h2><Table headers={["Vehicle", "Type", "Weight", "Volume", "Status"]} rows={vehicleRows} /></section>}
    {section === "capacity" && <div className={styles.metrics}>{thermalMetrics.map((metric) => <article key={metric.title}><small>{metric.title}</small><strong>{metric.capacity ? `${Math.round(metric.demand / metric.capacity * 100)}%` : "No capacity"}</strong><span>{metric.demand.toFixed(1)} of {metric.capacity.toFixed(1)} {metric.unit}</span></article>)}</div>}
    {section === "reference" && <section className={styles.card}><h2>Outlets</h2><Table headers={["Outlet", "Brand", "District", "Window", "Dock", "Access"]} rows={outlets.map((outlet) => [outlet.id, label(outlet.brand), outlet.district, `${outlet.windowOpenTime}–${outlet.windowCloseTime}`, label(outlet.dockType), label(outlet.parkingConstraint)])} /></section>}
  </section></WorkspaceShell>;
}
