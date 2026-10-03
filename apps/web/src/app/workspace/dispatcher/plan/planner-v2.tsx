"use client";

import { suggestAllocation, type AllocationOrder, type AllocationVehicle } from "@waypoint/allocation";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import styles from "./planner.module.css";
import { publishAssistedPlan } from "./actions";

type Driver = { id: string; displayName: string };
export function DispatcherPlanV2({ vehicles, orders, depot, drivers, serviceDate, expectedVersion }: { vehicles: AllocationVehicle[]; orders: AllocationOrder[]; depot: string; drivers: Driver[]; serviceDate: string; expectedVersion: number | null }) {
  const [generated, setGenerated] = useState(false), [version, setVersion] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({}), [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null), [publishing, setPublishing] = useState(false);
  const result = useMemo(() => suggestAllocation(vehicles, orders), [orders, vehicles]);
  const blocked = result.deferred.some(({ order }) => !reasons[order.id]) || result.trips.some((_, index) => !assignments[String(index)]);
  const nextDate = new Date(`${serviceDate}T00:00:00Z`); nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const rolloverDate = nextDate.toISOString().slice(0, 10);
  async function publish() {
    setError(null); setPublishing(true);
    try {
      const published = await publishAssistedPlan(result.trips.map((trip, index) => ({ vehicleId: trip.vehicleId, driverId: assignments[String(index)], orderIds: trip.orders.map((order) => order.id), brand: trip.orders[0].brand.toUpperCase() as "FRESH" | "STYLE" | "TECH", district: trip.orders[0].district })), result.deferred.map(({ order }) => ({ orderId: order.id, reason: reasons[order.id], nextDate: rolloverDate })), { serviceDate, expectedVersion: version ?? expectedVersion });
      setVersion(published);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Publish failed."); } finally { setPublishing(false); }
  }
  return <section><header className={styles.heading}><div><h1>{generated ? "Plan review" : "Orders"}</h1><p>{depot} · {serviceDate}</p></div><span className={version ? styles.published : styles.draft}>{version ? `Published v${version}` : generated ? "Draft" : `${orders.length} orders`}</span></header>
    {!generated ? <><form action="/workspace/dispatcher/plan"><label>Service date <input type="date" name="date" defaultValue={serviceDate} required /></label><button>Load queue</button></form><DataTable headers={["Order", "Outlet", "Brand", "District", "Temperature", "Weight", "Volume"]} rows={orders.map((order) => [order.id, order.outletId, order.brand, order.district, order.temperature, `${order.weightKg} kg`, `${order.volumeM3} m³`])} /><button disabled={!orders.length} onClick={() => setGenerated(true)}>Generate plan</button>{!orders.length && <p>No orders for this run.</p>}</> : <>
      <div className={styles.metrics}>{[["Allocated", result.served.length], ["Trips", result.trips.length], ["Deferred", result.deferred.length]].map(([title, count]) => <article className={styles.metric} key={title}><small>{title}</small><strong>{count}</strong></article>)}</div>
      <section className={styles.layout}><div className={styles.tripList}>{result.trips.map((trip, index) => <article className={styles.trip} key={`${trip.vehicleId}-${index}`}><header><strong>{trip.vehicleId} · Trip {index + 1}</strong><span>{trip.orders[0].brand} · {trip.orders[0].district}</span></header><div className={styles.stops}>{trip.orders.map((order) => <span key={order.id}>{order.outletId}</span>)}</div><footer><span>{trip.evaluation.totalWeightKg.toFixed(1)} kg</span><span>{trip.evaluation.totalVolumeM3.toFixed(3)} m³</span><span className={styles.pass}>Checks passed</span></footer><label>Driver <select value={assignments[String(index)] ?? ""} disabled={publishing || !!version} onChange={(event) => setAssignments((current) => ({ ...current, [index]: event.target.value }))}><option value="">Choose driver</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.displayName}</option>)}</select></label></article>)}</div><aside className={styles.checks}><h2>Checks</h2>{["Weight & volume", "Refrigeration", "Vehicle access", "Depot", "Brand & district", "Whole orders", "Two trips per vehicle"].map((check) => <p key={check}>{check}</p>)}{!drivers.length && <p>No active drivers. Register staff first.</p>}</aside></section>
      {!!result.deferred.length && <section className={styles.deferred}><h2>Deferrals · {rolloverDate}</h2>{result.deferred.map(({ order, reason }) => <article key={order.id}><div><strong>{order.id} · {order.outletId}</strong><p>{reason}</p></div><label>Reason <select value={reasons[order.id] ?? ""} disabled={publishing || !!version} onChange={(event) => setReasons((current) => ({ ...current, [order.id]: event.target.value }))}><option value="">Choose reason</option>{["Capacity full", "Temperature vehicle unavailable", "Delivery window conflict", "Access restriction", "Other"].map((reason) => <option key={reason}>{reason}</option>)}</select></label></article>)}</section>}
      <section className={styles.publish}><div><h2>{version ? `Plan v${version} published` : "Publish plan"}</h2>{blocked && <p>Assign each trip and choose every deferral reason.</p>}</div><button disabled={blocked || publishing || !!version} onClick={publish}>{publishing ? "Publishing…" : version ? "Published" : "Publish plan"}</button>{error && <p role="alert">{error}</p>}</section><button disabled={publishing} onClick={() => { setGenerated(false); if (version) window.location.reload(); }}>Back to queue</button>
    </>}
  </section>;
}
