"use client";

import { suggestAllocation, type AllocationOrder, type AllocationVehicle } from "@waypoint/allocation";
import { useMemo, useState } from "react";
import styles from "./planner.module.css";

const vehicles: AllocationVehicle[] = [
  { id: "VEH005", depot: "Peliyagoda", type: "truck", temperature: "reefer", weightCapacityKg: 6840, volumeCapacityM3: 33.4 },
  { id: "VEH012", depot: "Peliyagoda", type: "truck", temperature: "ambient", weightCapacityKg: 4200, volumeCapacityM3: 24 },
  { id: "VEH036", depot: "Peliyagoda", type: "van", temperature: "reefer", weightCapacityKg: 1040, volumeCapacityM3: 7 },
  { id: "VEH025", depot: "Peliyagoda", type: "truck", temperature: "ambient", weightCapacityKg: 3800, volumeCapacityM3: 22, inWorkshop: true }
];

const orders: AllocationOrder[] = [
  { id: "ORD0096518", outletId: "OUT010", depot: "Peliyagoda", brand: "Fresh", district: "Colombo", temperature: "chilled", parkingConstraint: "normal", weightKg: 264.5, volumeM3: 1.683 },
  { id: "ORD0096654", outletId: "OUT010", depot: "Peliyagoda", brand: "Fresh", district: "Colombo", temperature: "chilled", parkingConstraint: "normal", weightKg: 293.5, volumeM3: 1.683 },
  { id: "ORD0096797", outletId: "OUT010", depot: "Peliyagoda", brand: "Fresh", district: "Colombo", temperature: "ambient", parkingConstraint: "normal", weightKg: 359, volumeM3: 1.878 },
  { id: "ORD0096821", outletId: "OUT035", depot: "Peliyagoda", brand: "Style", district: "Colombo", temperature: "ambient", parkingConstraint: "mall_dock", weightKg: 657.5, volumeM3: 10.213 },
  { id: "ORD0096862", outletId: "OUT075", depot: "Peliyagoda", brand: "Fresh", district: "Puttalam", temperature: "chilled", parkingConstraint: "van_only", weightKg: 1200, volumeM3: 40 }
];

export function DispatcherPlan() {
  const [generated, setGenerated] = useState(false);
  const [published, setPublished] = useState(false);
  const [deferralReasonRecorded, setDeferralReasonRecorded] = useState(false);
  const result = useMemo(() => suggestAllocation(vehicles, orders), []);
  const hardFailures = result.deferred.length > 0 && !deferralReasonRecorded ? result.deferred.length : 0;

  return <section>
    <header className={styles.heading}><div><h1>Plan · Wed 25 Mar 2026</h1><p>{generated ? "Assisted plan generated · review, fix and approve before publishing" : "Peliyagoda · Queue closed at 16:00"}</p></div><span className={published ? styles.published : styles.draft}>{published ? "Published v1" : generated ? "Draft v1" : "Queue closed"}</span></header>
    <div className={styles.metrics}><Metric label="ORDERS PLANNED" value={generated ? `${result.served.length} / ${orders.length}` : "—"} detail={generated ? "Protected outlets placed first" : "Generate a plan to begin"} /><Metric label="VEHICLES" value={generated ? String(result.trips.length) : "4"} detail="1 in workshop" /><Metric label="TRIPS" value={generated ? String(result.trips.length) : "—"} detail="One brand and district each" /><Metric label="HARD-RULE FAILURES" value={generated ? String(hardFailures) : "—"} detail={generated ? (hardFailures ? "Publishing is blocked" : "Ready to publish") : "Awaiting plan"} critical={generated && hardFailures > 0} /></div>
    {!generated ? <section className={styles.empty}><h2>Review all confirmed orders in one place</h2><p>The planner will check vehicle capacity, temperature, outlet access, depot, brand and district before creating a draft. A Dispatcher still reviews the decision before it is published.</p><button onClick={() => setGenerated(true)}>Generate assisted plan</button></section> : <><section className={styles.layout}><div className={styles.tripList}>{result.trips.map((trip) => <article className={styles.trip} key={trip.vehicleId}><header><div><strong>{trip.vehicleId}</strong><span>Trip 1 · {trip.orders[0].brand} · {trip.orders[0].district}</span></div><span>{vehicles.find((vehicle) => vehicle.id === trip.vehicleId)?.temperature === "reefer" ? "Reefer" : "Ambient"}</span></header><div className={styles.stops}>{trip.orders.map((order) => <span key={order.id}>{order.outletId}</span>)}</div><footer><span>Weight <b>{trip.evaluation.totalWeightKg.toFixed(0)} kg</b></span><span>Volume <b>{trip.evaluation.totalVolumeM3.toFixed(1)} m³</b></span><span className={styles.pass}>✓ All checks pass</span></footer></article>)}</div><aside className={styles.checks}><h2>Constraint check</h2><Check label="Weight and volume" detail="Every allocated trip is within its vehicle limits." /><Check label="Temperature" detail="Chilled orders are on reefer vehicles." /><Check label="Vehicle access" detail="Van-only outlets use compatible vehicles." /><Check label="Depot, brand and district" detail="Every trip has a compatible grouping." /><Check label="Whole orders" detail="No order is split across vehicles." /><Check label="Workshop status" detail="Unavailable vehicle is excluded." /></aside></section>{result.deferred.length > 0 && <section className={styles.deferred}><h2>Orders needing a decision</h2>{result.deferred.map(({ order, reason }) => <article key={order.id}><div><strong>{order.id} · {order.outletId}</strong><p>{order.brand} {order.temperature} · {order.weightKg} kg · {order.volumeM3} m³</p></div><div><strong>Deferred</strong><p>{reason}</p><label>Reason required <select defaultValue="capacity" onChange={() => setDeferralReasonRecorded(true)}><option value="capacity">Capacity full</option><option value="temperature">Temperature vehicle unavailable</option><option value="window">Delivery window conflict</option><option value="access">Access restriction</option><option value="other">Other</option></select></label></div></article>)}</section>}<section className={styles.publish}><div><h2>{hardFailures ? "Publishing is blocked" : published ? "Plan v1 published" : "Ready to publish"}</h2><p>{hardFailures ? "Every deferred order needs a recorded reason and next run before publication." : published ? "Loaders, drivers and stores have received their part of the plan." : "All constraints pass. Publish the versioned plan to affected roles."}</p></div><button disabled={hardFailures > 0 || published} onClick={() => setPublished(true)}>{published ? "Published" : "Publish v1"}</button></section></>}</section>;
}

function Metric({ label, value, detail, critical }: Readonly<{ label: string; value: string; detail: string; critical?: boolean }>) { return <article className={`${styles.metric} ${critical ? styles.critical : ""}`}><small>{label}</small><strong>{value}</strong><span>{detail}</span></article>; }
function Check({ label, detail }: Readonly<{ label: string; detail: string }>) { return <article className={styles.check}><span>✓</span><div><strong>{label}</strong><p>{detail}</p></div></article>; }
