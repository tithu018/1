import Link from "next/link";
import { ArrowRight, Check, CircleCheck, Clock3, CloudUpload, MapPin, Package, Route, ShieldCheck, Truck, UserRound } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getDriverTrip } from "@/lib/driver-data";
import { requireRole } from "@/lib/auth";
import { prisma } from "@waypoint/database";
import { displayDate, label } from "@/lib/format";
import { RefreshDriver } from "./driver-chrome";
import styles from "./driver.module.css";

export default async function DriverTodayPage() {
  const session = await requireRole("driver");
  const [trip, conflicts, notifications] = await Promise.all([
    getDriverTrip(),
    prisma.syncOperation.count({ where: { accountId: session.accountId, status: "CONFLICT" } }),
    prisma.notification.findMany({ where: { recipientId: session.accountId, readAt: null }, orderBy: { createdAt: "desc" }, take: 3 })
  ]);
  const stops = trip?.allocations ?? [], next = stops.find(({ order }) => order.status !== "DELIVERED");
  const done = stops.filter(({ order }) => order.status === "DELIVERED").length;
  return <WorkspaceShell role="driver" active="Today"><div className={styles.page}>
    <header className={styles.title}><div><span className={styles.eyebrow}>{displayDate()}</span><h1>Hello, {session.displayName.split(" ")[0]}</h1><p>Your route, one stop at a time.</p></div><RefreshDriver /></header>
    <div className={styles.grid}><div className={styles.page}>
      <section className={styles.hero}><div className={styles.heroTop}><span className={styles.eyebrow}>{trip?.status === "OUT_FOR_DELIVERY" ? "Next delivery" : "Ready for departure"}</span><span className={styles.tag}><Truck />{trip ? label(trip.status) : "Awaiting trip"}</span></div>
        <h2>{next?.order.outlet.address ?? next?.order.outletId ?? "No assigned trip"}</h2>
        {trip && <><p><MapPin />{trip.district} · {trip.vehicleId}</p><p><Clock3 />{next ? `${next.order.deliveryWindowOpen}–${next.order.deliveryWindowClose}` : "All stops delivered"}</p><p><Package />{stops.length} stops · {stops.reduce((sum, { order }) => sum + order.units, 0)} units</p><Link className={styles.primary} href="/workspace/driver/trip">{trip.status === "OUT_FOR_DELIVERY" ? "Continue trip" : "Review & start trip"}<ArrowRight /></Link></>}
        {!trip && <p>Assigned trips appear after loading is confirmed.</p>}
      </section>
      <div className={styles.stats}><article className={styles.stat}><Route /><strong>{stops.length}</strong><span>Route stops</span></article><article className={styles.stat}><CircleCheck /><strong>{done}</strong><span>Delivered</span></article><article className={styles.stat}><Package /><strong>{stops.length - done}</strong><span>Remaining</span></article></div>
      <div className={styles.quickActions}><Link className={styles.quickAction} href="/workspace/driver/sync"><CloudUpload />Sync & records</Link><Link className={styles.quickAction} href="/workspace/driver/profile"><UserRound />My profile</Link></div>
      {!!conflicts && <Link className={`${styles.notice} ${styles.alert}`} href="/workspace/driver/sync"><CloudUpload />{conflicts} delivery {conflicts === 1 ? "record needs" : "records need"} review. Open Sync.</Link>}
      <p className={styles.notice}><ShieldCheck />Stop safely before recording delivery details.</p>
    </div><div className={styles.page}>
      <section className={styles.card}><div className={styles.sectionHeading}><h2><Route />Your route</h2><span>{trip ? `Trip ${trip.tripNumber}` : "No route"}</span></div>
        {stops.length ? <ol className={styles.route}>{stops.map(({ order, sequence }) => <li className={`${styles.stop} ${order.status === "DELIVERED" ? styles.done : order.id === next?.order.id ? styles.current : ""}`} key={order.id}><span className={styles.number}>{order.status === "DELIVERED" ? <Check /> : sequence}</span><div><strong>{order.outletId}</strong><p>{order.outlet.address ?? trip?.district}</p><small><Clock3 />{order.deliveryWindowOpen}–{order.deliveryWindowClose}</small></div><span>{order.status === "DELIVERED" ? "Done" : order.id === next?.order.id ? "Next" : "Upcoming"}</span></li>)}</ol> : <div className={styles.empty}><Route /><h2>Ready when you are</h2><p>No loaded trip is assigned to you yet.</p></div>}
      </section>
      {notifications.length > 0 && <section className={styles.card}><div className={styles.sectionHeading}><h2><CloudUpload />Office updates</h2></div><div className={styles.history}>{notifications.map((item) => <article key={item.id}><div><strong>{item.title}</strong><p>{item.body}</p></div></article>)}</div></section>}
    </div></div>
  </div></WorkspaceShell>;
}
