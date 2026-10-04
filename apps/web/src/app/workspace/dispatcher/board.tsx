"use client";
import Link from "next/link";
import { useState } from "react";
import { Truck, UserRound, PackageCheck, TriangleAlert, Search, Route, Clock3 } from "lucide-react";
import { displayDate, displayTime, label } from "@/lib/format";
import { DriverAssignment } from "./plan/driver-assignment";
import styles from "./[section]/section.module.css";

export type BoardTrip = {
  id: string; number: number; vehicle: string; driverId: string | null; driverName: string | null;
  status: string; date: string; version: number; brand: string; district: string; workshop: boolean; departure: string | null;
  stops: { id: string; outlet: string; units: number; status: string; receiver: string | null;
    receipt: { received: number; expected: number; outcome: string } | null;
    issues: { id: string; summary: string }[] }[];
};

export function DispatcherBoard({ trips, drivers }: { trips: BoardTrip[]; drivers: { id: string; displayName: string }[] }) {
  const [query, setQuery] = useState(""), [status, setStatus] = useState("all");
  const stops = trips.flatMap((trip) => trip.stops);
  const metrics = [
    { title: "Active trips", count: trips.filter((trip) => trip.status !== "DELIVERED").length, icon: Truck },
    { title: "On the road", count: trips.filter((trip) => trip.status === "OUT_FOR_DELIVERY").length, icon: Route },
    { title: "Awaiting store", count: stops.filter((stop) => stop.status === "DELIVERED" && !stop.receipt).length, icon: Clock3 },
    { title: "Store verified", count: stops.filter((stop) => stop.receipt?.outcome === "full").length, icon: PackageCheck }
  ];
  const visible = trips.filter((trip) => (status === "all" || trip.status === status) && [trip.vehicle, trip.driverName, trip.district, trip.brand, ...trip.stops.flatMap((stop) => [stop.id, stop.outlet])].join(" ").toLowerCase().includes(query.toLowerCase()));
  return <><div className={styles.metrics}>{metrics.map(({ title, count, icon: Icon }) => <article key={title}><small><Icon size={17} />{title}</small><strong>{count}</strong></article>)}</div>
    <div className={styles.toolbar}><label className={styles.search}><Search size={17} /><input aria-label="Search trips" placeholder="Vehicle, driver, outlet or order" value={query} onChange={(event) => setQuery(event.target.value)} /></label><select aria-label="Trip status" value={status} onChange={(event) => setStatus(event.target.value)}>{[["all", "All trips"], ["ALLOCATED", "Awaiting load"], ["LOADED", "Ready to depart"], ["OUT_FOR_DELIVERY", "On the road"], ["DELIVERED", "Driver completed"]].map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select><span>{visible.length} trips</span></div>
    <div className={styles.tripGrid}>{visible.map((trip) => {
      const delivered = trip.stops.filter((stop) => stop.status === "DELIVERED").length;
      return <article className={styles.card} key={trip.id}><div className={styles.cardTitle}><h2><Truck size={20} />{trip.vehicle} <small>Trip {trip.number}</small></h2><span className={`${styles.badge} ${trip.status === "DELIVERED" ? styles.success : styles.warning}`}>{trip.status === "DELIVERED" ? "Driver completed" : label(trip.status)}</span></div>
        <p className={styles.tripMeta}>{label(trip.brand)} · {trip.district} · {displayDate(trip.date)} · v{trip.version}</p>
        <p className={styles.tripMeta}>Planned departure: {trip.departure ? displayTime(trip.departure) : "Not set"}</p>
        <div className={styles.driver}><UserRound size={17} />{["ALLOCATED", "LOADED"].includes(trip.status) ? <DriverAssignment key={`${trip.id}-${trip.driverId}`} tripId={trip.id} driverId={trip.driverId} drivers={drivers} /> : trip.driverName ?? "Unassigned"}</div>
        {trip.workshop && <p className={styles.notice}><TriangleAlert size={17} />Vehicle in workshop — replan before loading.</p>}
        <div className={styles.progressLine}><span>{delivered} / {trip.stops.length} delivered by driver</span><progress value={delivered} max={Math.max(trip.stops.length, 1)} /></div>
        <details className={styles.stopDetails}><summary>Stops & store verification</summary><div className={styles.stopList}>{trip.stops.map((stop, index) => <div key={stop.id}><strong>{index + 1}. {stop.outlet}<small>{stop.id} · {stop.units} units</small></strong><span>{stop.status !== "DELIVERED" ? label(stop.status) : !stop.receipt ? "Awaiting store verification" : stop.receipt.outcome === "full" ? "Store verified" : `${stop.receipt.received}/${stop.receipt.expected} received · ${stop.receipt.outcome === "reservation" ? "Inspection pending" : "Receipt issue"}`}</span>{stop.receiver && <small>Receiver: {stop.receiver}</small>}{stop.issues.map((issue) => <Link key={issue.id} href={`/workspace/dispatcher/issues/${issue.id}`}><TriangleAlert size={14} />{issue.summary}</Link>)}</div>)}</div></details>
      </article>;
    })}</div>{!visible.length && <div className={styles.empty}><Truck size={30} /><h2>{trips.length ? "No matching trips" : "No published trips"}</h2><p>{trips.length ? "Try another search or status." : "Published trips and outstanding store receipts appear here."}</p><Link href="/workspace/dispatcher/plan">Open planner</Link></div>}
  </>;
}
