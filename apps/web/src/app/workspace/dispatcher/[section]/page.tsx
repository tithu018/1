import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@waypoint/database";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/lib/auth";
import { displayDate, displayTime, label } from "@/lib/format";
import styles from "./section.module.css";
import { DeferralLog } from "../deferral-log";
import { DispatcherBoard } from "../board";
import { DispatcherRefresh } from "../refresh";
import { getDispatcherBoard } from "@/lib/dispatcher-data";
import { localDate, parseServiceDate } from "@/lib/operating-date";
import { TriangleAlert } from "lucide-react";

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return <div className={styles.tableWrap}><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table>{!rows.length && <p className={styles.caption}>No records to display.</p>}</div>;
}

export default async function DispatcherSectionPage({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ date?: string; cases?: string }> }) {
  const { section } = await params;
  const titles: Record<string, string> = { board: "Live Board", attention: "Needs Attention", deferrals: "Deferral Log", capacity: "Capacity Forecast", reference: "Reference Data" };
  if (!titles[section]) notFound();
  const session = await requireRole("dispatcher");
  if (!session.depotId) notFound();
  const filters = await searchParams;
  let serviceDate = parseServiceDate(localDate());
  try { if (filters.date) serviceDate = parseServiceDate(filters.date); } catch { return <WorkspaceShell role="dispatcher" active={titles[section]}><p>Choose a valid date. <Link href={`/workspace/dispatcher/${section}`}>Reset date</Link></p></WorkspaceShell>; }
  const board = section === "board" ? await getDispatcherBoard(session.depotId, serviceDate) : [];
  const drivers = await prisma.account.findMany({ where: { depotId: session.depotId, role: "DRIVER", isActive: true }, select: { id: true, displayName: true } });
  const [vehicles, outlets, orders, issues, plan, events] = await Promise.all([
    prisma.vehicle.findMany({ where: { depotId: session.depotId }, orderBy: { id: "asc" } }),
    prisma.outlet.findMany({ where: { depotId: session.depotId }, orderBy: { id: "asc" } }),
    prisma.order.findMany({ where: { outlet: { depotId: session.depotId }, status: { in: ["SUBMITTED", "CONFIRMED", "DEFERRED"] } } }),
    prisma.issueCase.findMany({ where: { order: { outlet: { depotId: session.depotId } }, ...(filters.cases === "all" ? {} : { status: { not: "RESOLVED" as const } }) }, include: { order: true, openedBy: { select: { role: true } } }, orderBy: { updatedAt: "desc" } }),
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
    <header className={styles.heading}><div><h1>{titles[section]}</h1><p>{session.depotId} · {section === "deferrals" ? "All recorded events" : section === "board" ? displayDate(serviceDate) : plan ? `${displayDate(plan.serviceDate)} · Plan v${plan.version}` : "No published plan"}</p></div><DispatcherRefresh live={section === "board" || section === "attention"} /></header>
    {section === "board" && <><form className={styles.toolbar} action="/workspace/dispatcher/board"><label>Completed run <input type="date" name="date" defaultValue={serviceDate.toISOString().slice(0, 10)} required /></label><button>View date</button><span>Unfinished trips and pending receipts remain visible.</span></form><DispatcherBoard trips={board.map((trip) => ({ id: trip.id, number: trip.tripNumber, vehicle: trip.vehicleId, driverId: trip.driverId, driverName: trip.driver?.displayName ?? null, status: trip.status, date: trip.plan.serviceDate.toISOString(), version: trip.plan.version, brand: trip.brand, district: trip.district, workshop: trip.vehicle.isInWorkshop, departure: trip.plannedStart?.toISOString() ?? null, stops: trip.allocations.map(({ order }) => ({ id: order.id, outlet: order.outletId, units: order.units, status: order.status, receiver: order.deliveryOutcome?.receiverName ?? null, receipt: order.receipt ? { received: order.receipt.receivedUnits, expected: order.receipt.expectedUnits, outcome: order.receipt.outcome } : null, issues: order.issues })) }))} drivers={drivers} /></>}
    {section === "attention" && <><div className={styles.toolbar}><Link aria-current={filters.cases !== "all" ? "page" : undefined} href="/workspace/dispatcher/attention">Open cases</Link><Link aria-current={filters.cases === "all" ? "page" : undefined} href="/workspace/dispatcher/attention?cases=all">All cases</Link><span>{issues.length} cases</span></div><section className={styles.card}><h2><TriangleAlert size={20} />{filters.cases === "all" ? "Issue history" : "Needs action"}</h2><Table headers={["Case", "Order / outlet", "Reported by", "Problem", "Status", "Updated"]} rows={issues.map((issue) => [<Link key={issue.id} href={`/workspace/dispatcher/issues/${issue.id}`}>Open case</Link>, <span key={issue.id}>{issue.orderId}<small className={styles.subtext}>{issue.order.outletId}</small></span>, issue.openedBy ? label(issue.openedBy.role) : "Not recorded", issue.summary, <span key={issue.id} className={`${styles.badge} ${issue.status === "RESOLVED" ? styles.success : styles.warning}`}>{label(issue.status)}</span>, `${displayDate(issue.updatedAt)} · ${displayTime(issue.updatedAt)}`])} /></section></>}
    {section === "deferrals" && <DeferralLog records={events.map((event) => ({ id: event.id, orderId: event.orderId, outlet: event.order.outletId, brand: event.order.outlet.brand, units: event.order.units, recorded: event.createdAt.toISOString(), reason: event.reason ?? "Not recorded", requested: event.order.requestedDate.toISOString(), status: event.order.status }))} />}
    {section === "capacity" && <><div className={styles.metrics}><article><small>QUEUED DEMAND</small><strong>{demand.toLocaleString()} kg</strong><span>{orders.length} orders</span></article><article><small>AVAILABLE WEIGHT CAPACITY</small><strong>{capacity.toLocaleString()} kg</strong><span>{vehicles.filter((vehicle) => !vehicle.isInWorkshop).length} vehicles</span></article><article><small>WEIGHT PRESSURE</small><strong>{capacity ? `${Math.round(demand / capacity * 100)}%` : "No capacity"}</strong><span>Queued demand against current fleet</span></article></div><p className={styles.caption}>This is a current queue estimate. Temperature, volume, access and route constraints are checked in the planner.</p></>}
    {(section === "capacity" || section === "reference") && <section className={styles.card}><h2>Vehicles</h2><Table headers={["Vehicle", "Type", "Weight", "Volume", "Status"]} rows={vehicleRows} /></section>}
    {section === "capacity" && <div className={styles.metrics}>{thermalMetrics.map((metric) => <article key={metric.title}><small>{metric.title}</small><strong>{metric.capacity ? `${Math.round(metric.demand / metric.capacity * 100)}%` : "No capacity"}</strong><span>{metric.demand.toFixed(1)} of {metric.capacity.toFixed(1)} {metric.unit}</span></article>)}</div>}
    {section === "reference" && <section className={styles.card}><h2>Outlets</h2><Table headers={["Outlet", "Brand", "District", "Window", "Dock", "Access"]} rows={outlets.map((outlet) => [outlet.id, label(outlet.brand), outlet.district, `${outlet.windowOpenTime}–${outlet.windowCloseTime}`, label(outlet.dockType), label(outlet.parkingConstraint)])} /></section>}
  </section></WorkspaceShell>;
}
