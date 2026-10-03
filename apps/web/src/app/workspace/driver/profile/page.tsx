import { Building2, CheckCheck, CircleCheck, Clock3, KeyRound, LogOut, Mail, ShieldCheck, Truck, UserRound } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/lib/auth";
import { prisma } from "@waypoint/database";
import { signOut } from "@/app/sign-in/actions";
import { displayDate, displayTime } from "@/lib/format";
import { localDate } from "@/lib/operating-date";
import { DriverPasswordForm, DriverProfileForm } from "./profile-forms";
import styles from "../driver.module.css";

export default async function DriverProfilePage() {
  const session = await requireRole("driver");
  const todayStart = new Date(`${localDate()}T00:00:00+05:30`);
  const [account, depot, deliveries, completed, today, trips] = await Promise.all([
    prisma.account.findUniqueOrThrow({ where: { id: session.accountId } }),
    session.depotId ? prisma.depot.findUnique({ where: { id: session.depotId } }) : null,
    prisma.deliveryOutcomeRecord.findMany({ where: { driverId: session.accountId }, include: { order: { select: { outletId: true } } }, orderBy: { recordedAt: "desc" }, take: 5 }),
    prisma.deliveryOutcomeRecord.count({ where: { driverId: session.accountId, outcome: "DELIVERED" } }),
    prisma.deliveryOutcomeRecord.count({ where: { driverId: session.accountId, outcome: "DELIVERED", recordedAt: { gte: todayStart } } }),
    prisma.trip.count({ where: { driverId: session.accountId, status: "DELIVERED", plan: { status: "PUBLISHED" } } })
  ]);
  const initials = account.displayName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("");
  return <WorkspaceShell role="driver" active="Profile"><div className={styles.page}>
    <header className={styles.title}><div><span className={styles.eyebrow}>Your account</span><h1>My profile</h1></div></header>
    <section className={styles.profileHero}><span className={styles.avatar}>{initials}</span><div><h1>{account.displayName}</h1><p>Driver · {depot?.name ?? "No depot assigned"}</p><span className={styles.tag}><ShieldCheck />Active account</span></div></section>
    <div className={styles.stats}><article className={styles.stat}><CircleCheck /><strong>{today}</strong><span>Delivered today</span></article><article className={styles.stat}><CheckCheck /><strong>{completed}</strong><span>Total delivered</span></article><article className={styles.stat}><Truck /><strong>{trips}</strong><span>Trips completed</span></article></div>
    <div className={styles.grid}><div className={styles.page}>
      <section className={styles.card}><div className={styles.sectionHeading}><h2><UserRound />Account details</h2></div><dl className={styles.details}><div><dt><Mail />Email</dt><dd>{account.email}</dd></div><div><dt><Building2 />Depot</dt><dd>{depot?.name ?? "Unassigned"}</dd></div><div><dt><ShieldCheck />Role</dt><dd>Driver</dd></div></dl><div style={{ marginTop: 20 }}><DriverProfileForm name={account.displayName} /></div></section>
      <section className={styles.card}><div className={styles.sectionHeading}><h2><Clock3 />Recent delivery activity</h2></div><div className={styles.history}>{deliveries.map((delivery) => <article key={delivery.id}>{delivery.outcome === "DELIVERED" ? <CircleCheck /> : <Clock3 />}<div><strong>{delivery.order.outletId}</strong><p>{delivery.outcome === "DELIVERED" ? "Delivered" : "Delivery problem"} · {displayDate(delivery.recordedAt)}</p></div><time>{displayTime(delivery.recordedAt)}</time></article>)}</div>{!deliveries.length && <p className={styles.notice}>Your delivery history will appear here.</p>}</section>
    </div><div className={styles.page}><section className={styles.card}><div className={styles.sectionHeading}><h2><KeyRound />Security</h2></div><DriverPasswordForm /></section><form action={signOut}><button className={styles.danger}><LogOut />Sign out</button></form></div></div>
  </div></WorkspaceShell>;
}
