import { prisma } from "@waypoint/database";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/lib/auth";
import { label } from "@/lib/format";
import { RegistrationForm } from "./registration-form";
import styles from "./registration.module.css";

export default async function RegistrationPage() {
  const session = await requireRole("dispatcher");
  const managers = session.depotId ? await prisma.account.findMany({ where: { role: "STORE_MANAGER", outlet: { depotId: session.depotId } }, include: { outlet: true }, orderBy: { createdAt: "desc" } }) : [];
  return <WorkspaceShell role="dispatcher" active="Registration"><section className={styles.page}>
    <header><h1>Registration dashboard</h1><p>Manage store-manager registration for Fresh, Style and Tech outlets.</p></header>
    <div className={styles.metrics}>{["FRESH", "STYLE", "TECH"].map((brand) => <article key={brand}><strong>{managers.filter((account) => account.outlet?.brand === brand).length}</strong><span>{label(brand)} managers</span></article>)}</div>
    {session.depotId ? <RegistrationForm depot={session.depotId} /> : <p role="alert">Your account needs a depot before you can register managers.</p>}
    <section className={styles.card}><h2>Registered store managers</h2><div className={styles.table}><table><thead><tr><th>Manager</th><th>Email</th><th>Outlet</th><th>Store type</th><th>District</th><th>Delivery window</th></tr></thead><tbody>{managers.map((account) => <tr key={account.id}><td>{account.displayName}</td><td>{account.email}</td><td>{account.outletId}</td><td>{label(account.outlet!.brand)}</td><td>{account.outlet!.district}</td><td>{account.outlet!.windowOpenTime}–{account.outlet!.windowCloseTime}</td></tr>)}</tbody></table></div>{!managers.length && <p>No store managers registered for this depot yet.</p>}</section>
  </section></WorkspaceShell>;
}
