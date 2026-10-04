"use client";

import { suggestAllocation, type AllocationOrder, type AllocationVehicle } from "@waypoint/allocation";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import styles from "./planner.module.css";
import { publishAssistedPlan } from "./actions";
import Link from "next/link";
import { Route, CalendarDays, CheckCircle2, Truck, ArrowLeft, Send, TriangleAlert } from "lucide-react";

type Driver = { id: string; displayName: string };
export function DispatcherPlanV2({ vehicles, orders, depot, drivers, serviceDate, expectedVersion, locked }: { locked: boolean; vehicles: AllocationVehicle[]; orders: AllocationOrder[]; depot: string; drivers: Driver[]; serviceDate: string; expectedVersion: number | null }) {
  const [generated, setGenerated] = useState(false), [version, setVersion] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({}), [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null), [publishing, setPublishing] = useState(false);
  const result = useMemo(() => suggestAllocation(vehicles, orders), [orders, vehicles]);
  const driverCounts = Object.values(assignments).reduce<Record<string, number>>((counts, id) => { if (id) counts[id] = (counts[id] ?? 0) + 1; return counts; }, {});
  const overloadedDriver = Object.values(driverCounts).some((count) => count > 2);
  const blocked = overloadedDriver || result.deferred.some(({ order }) => !reasons[order.id]) || result.trips.some((_, index) => !assignments[String(index)]);
  const nextDate = new Date(`${serviceDate}T00:00:00Z`); nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const rolloverDate = nextDate.toISOString().slice(0, 10);
  async function publish() {
    setError(null); setPublishing(true);
    try {
      const published = await publishAssistedPlan(result.trips.map((trip, index) => ({ vehicleId: trip.vehicleId, driverId: assignments[String(index)], orderIds: trip.orders.map((order) => order.id), brand: trip.orders[0].brand.toUpperCase() as "FRESH" | "STYLE" | "TECH", district: trip.orders[0].district })), result.deferred.map(({ order }) => ({ orderId: order.id, reason: reasons[order.id], nextDate: rolloverDate })), { serviceDate, expectedVersion: version ?? expectedVersion });
      setVersion(published);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Publish failed."); } finally { setPublishing(false); }
  }
  return <section className={styles.page}><header className={styles.heading}><div><h1>{generated ? "Plan review" : "Delivery planning"}</h1><p>{depot} · {serviceDate}</p></div><span className={version ? styles.published : styles.draft}>{version ? `Published v${version}` : generated ? "Draft" : `${orders.length} orders`}</span></header>
    {locked && <p className={styles.error}><TriangleAlert size={17} />A trip on this run has departed. The published plan is locked. <Link href="/workspace/dispatcher/board">View trips</Link></p>}
    {!generated ? <><form className={styles.queueToolbar} action="/workspace/dispatcher/plan"><label><CalendarDays size={17} />Service date <input type="date" name="date" defaultValue={serviceDate} required /></label><button className={styles.secondary}>Load queue</button><Link href="/workspace/dispatcher/board">Live board</Link></form><div className={styles.metrics}>{[["Queued orders", orders.length], ["Available vehicles", vehicles.filter((vehicle) => !vehicle.inWorkshop).length], ["Active drivers", drivers.length]].map(([title, count]) => <article className={styles.metric} key={title}><small>{title}</small><strong>{count}</strong></article>)}</div><section className={styles.queue}><h2>Orders for this run</h2><DataTable headers={["Order", "Outlet", "Brand", "District", "Temperature", "Weight", "Volume"]} rows={orders.map((order) => [order.id, order.outletId, order.brand, order.district, order.temperature, `${order.weightKg} kg`, `${order.volumeM3} m³`])} /></section><button className={styles.primary} disabled={locked || !orders.length} onClick={() => setGenerated(true)}><Route size={18} />Generate plan</button>{!orders.length && <p>No eligible orders for this run.</p>}</> : <>
      <div className={styles.metrics}>{[["Allocated", result.served.length], ["Trips", result.trips.length], ["Deferred", result.deferred.length]].map(([title, count]) => <article className={styles.metric} key={title}><small>{title}</small><strong>{count}</strong></article>)}</div>
      <section className={styles.layout}><div className={styles.tripList}>{result.trips.map((trip, index) => <article className={styles.trip} key={`${trip.vehicleId}-${index}`}><header><strong><Truck size={18} />{trip.vehicleId} · Trip {index + 1}</strong><span>{trip.orders[0].brand} · {trip.orders[0].district}</span></header><div className={styles.stops}>{trip.orders.map((order, sequence) => <span key={order.id}>{sequence + 1}. {order.outletId}</span>)}</div><footer><span>{trip.evaluation.totalWeightKg.toFixed(1)} kg</span><span>{trip.evaluation.totalVolumeM3.toFixed(3)} m³</span><span className={styles.pass}>Checks passed</span></footer><label>Driver <select value={assignments[String(index)] ?? ""} disabled={publishing || !!version} onChange={(event) => setAssignments((current) => ({ ...current, [index]: event.target.value }))}><option value="">Choose driver</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.displayName}</option>)}</select></label></article>)}</div><aside className={styles.checks}><h2>Vehicle checks</h2>{["Weight & volume", "Refrigeration", "Vehicle access", "Depot", "Brand & district", "Whole orders", "Two trips per vehicle"].map((check) => <p className={styles.checkRow} key={check}><CheckCircle2 size={16} />{check}</p>)}{!drivers.length && <p>No active drivers. <Link href="/workspace/dispatcher/registration">Register staff</Link></p>}</aside></section>
      {!!result.deferred.length && <section className={styles.deferred}><h2>Deferrals · {rolloverDate}</h2>{result.deferred.map(({ order, reason }) => <article key={order.id}><div><strong>{order.id} · {order.outletId}</strong><p>{reason}</p></div><label>Reason <select value={reasons[order.id] ?? ""} disabled={publishing || !!version} onChange={(event) => setReasons((current) => ({ ...current, [order.id]: event.target.value }))}><option value="">Choose reason</option>{["Capacity full", "Temperature vehicle unavailable", "Delivery window conflict", "Access restriction", "Other"].map((reason) => <option key={reason}>{reason}</option>)}</select></label></article>)}</section>}
      <section className={styles.publish}><div><h2>{version ? `Plan v${version} published` : "Publish plan"}</h2>{blocked && <p>{overloadedDriver ? "A driver can have at most two trips per day." : "Assign each trip and choose every deferral reason."}</p>}{version && <Link href="/workspace/dispatcher/board">View live board</Link>}</div><button disabled={blocked || publishing || !!version} onClick={publish}><Send size={17} />{publishing ? "Publishing…" : version ? "Published" : "Publish plan"}</button></section>{error && <p className={styles.error} role="alert"><TriangleAlert size={17} />{error}</p>}<button className={styles.secondary} disabled={publishing} onClick={() => { setGenerated(false); if (version) window.location.reload(); }}><ArrowLeft size={17} />Back to queue</button>
    </>}
  </section>;
}
