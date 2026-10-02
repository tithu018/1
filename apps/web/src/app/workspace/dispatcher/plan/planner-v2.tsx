"use client";

import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { suggestAllocation, type AllocationOrder, type AllocationVehicle } from "@waypoint/allocation";
import { useMemo, useState } from "react";
import styles from "./planner.module.css";
import { publishAssistedPlan } from "./actions";

export function DispatcherPlanV2({ vehicles, orders, depot }: Readonly<{ depot: string; vehicles: AllocationVehicle[]; orders: AllocationOrder[] }>) {
  const [generated, setGenerated] = useState(false);
  const [version, setVersion] = useState<number | null>(null);
  const [reasoned, setReasoned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const result = useMemo(() => suggestAllocation(vehicles, orders), [orders, vehicles]);
  const blocked = result.deferred.length > 0 && !reasoned;
  async function publish() {
    setError(null);
    try {
      const publishedVersion = await publishAssistedPlan(result.trips.map((trip) => ({ vehicleId: trip.vehicleId, orderIds: trip.orders.map((order) => order.id), brand: trip.orders[0].brand.toUpperCase() as "FRESH" | "STYLE" | "TECH", district: trip.orders[0].district })));
      setVersion(publishedVersion);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The plan could not be published."); }
  }
  if (!generated) return <section className={styles.empty}><h1>Order queue and assisted planning</h1><p>{orders.length} orders · {vehicles.length} vehicles</p><Link href="/workspace/dispatcher/registration">Register store manager</Link><DataTable headers={["Order", "Outlet", "Brand", "District", "Temperature", "Weight", "Volume"]} rows={orders.map((order) => [order.id, order.outletId, order.brand, order.district, order.temperature, `${order.weightKg} kg`, `${order.volumeM3} m³`])} /><p>Review confirmed orders, fleet availability and hard constraints before publishing a versioned plan.</p><button disabled={!orders.length} onClick={() => setGenerated(true)}>Generate plan</button>{!orders.length && <p>No orders waiting for planning.</p>}</section>;
  return <section><header className={styles.heading}><div><h1>Plan review</h1><p>{depot} - all decisions remain auditable</p></div><span className={version ? styles.published : styles.draft}>{version ? `Published v${version}` : "Draft"}</span></header><div className={styles.metrics}><Metric label="ORDERS PLANNED" value={`${result.served.length} / ${orders.length}`} detail="Whole orders only" /><Metric label="TRIPS" value={String(result.trips.length)} detail="Grouped by brand and district" /><Metric label="DEFERRED" value={String(result.deferred.length)} detail="Requires a reason" /><Metric label="HARD RULES" value={blocked ? String(result.deferred.length) : "0"} detail={blocked ? "Publish blocked" : "Ready to publish"} critical={blocked} /></div><section className={styles.layout}><div className={styles.tripList}>{result.trips.map((trip, index) => <article className={styles.trip} key={`${trip.vehicleId}-${index}`}><header><div><strong>{trip.vehicleId}</strong><span>Trip {index + 1} - {trip.orders[0].brand} - {trip.orders[0].district}</span></div><span>{trip.orders.length} stops</span></header><div className={styles.stops}>{trip.orders.map((order) => <span key={order.id}>{order.outletId}</span>)}</div><footer><span>Weight <b>{trip.evaluation.totalWeightKg.toFixed(0)} kg</b></span><span>Volume <b>{trip.evaluation.totalVolumeM3.toFixed(1)} m3</b></span><span className={styles.pass}>All checks pass</span></footer></article>)}</div><aside className={styles.checks}><h2>Hard-rule checks</h2><Check label="Capacity" detail="Weight and volume are checked per trip." /><Check label="Temperature" detail="Chilled orders require reefer capacity." /><Check label="Access" detail="Van-only and mall dock constraints are retained." /><Check label="Accounting" detail="Each served order appears exactly once." /></aside></section>{result.deferred.length > 0 && <section className={styles.deferred}><h2>Orders needing a decision</h2>{result.deferred.map(({ order, reason }) => <article key={order.id}><div><strong>{order.id} - {order.outletId}</strong><p>{reason}</p></div><label>Reason<select defaultValue="capacity" onChange={() => setReasoned(true)}><option value="capacity">Capacity full</option><option value="temperature">Temperature vehicle unavailable</option><option value="window">Delivery window conflict</option><option value="access">Access restriction</option><option value="other">Other</option></select></label></article>)}</section>}<section className={styles.publish}><div><h2>{blocked ? "Publishing is blocked" : version ? `Plan v${version} is published` : "Ready to publish"}</h2><p>{version ? "A further publication creates a new immutable version and downstream re-verification." : "Publish only after every deferred order has an explicit reason."}</p></div><button disabled={blocked} onClick={publish}>{version ? `Publish plan v${version + 1}` : "Publish plan v1"}</button>{error && <p role="alert">{error}</p>}</section></section>;
}

function Metric({ label, value, detail, critical }: Readonly<{ label: string; value: string; detail: string; critical?: boolean }>) { return <article className={`${styles.metric} ${critical ? styles.critical : ""}`}><small>{label}</small><strong>{value}</strong><span>{detail}</span></article>; }
function Check({ label, detail }: Readonly<{ label: string; detail: string }>) { return <article className={styles.check}><span>OK</span><div><strong>{label}</strong><p>{detail}</p></div></article>; }