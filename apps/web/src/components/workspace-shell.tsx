import Link from "next/link";
import { APP_NAME, roleLabels, type UserRole } from "@waypoint/domain";
import styles from "./workspace-shell.module.css";

const navigation: Record<UserRole, readonly string[]> = {
  store_manager: ["Dashboard", "Place order", "Order status", "Receive", "History & issues", "Notifications", "Settings"],
  dispatcher: ["Plan", "Live Board", "Needs Attention", "Deferral Log", "Capacity Forecast", "Reference Data"],
  loader: ["Trip queue", "Active load", "Loading issues"],
  driver: ["Today", "Active trip", "Sync"]
};

function hrefFor(role: UserRole, item: string) {
  if (role === "store_manager" && item === "Place order") return "/workspace/store_manager/orders";
  return `/workspace/${role}`;
}

export function WorkspaceShell({ role, active, children }: Readonly<{ role: UserRole; active: string; children: React.ReactNode }>) {
  const isDriver = role === "driver";
  return (
    <div className={isDriver ? styles.driverShell : styles.shell}>
      {!isDriver && <aside className={styles.sidebar}>
        <Link href="/" className={styles.logo}><span>W</span>{APP_NAME}</Link>
        <nav aria-label={`${roleLabels[role]} navigation`}>
          {navigation[role].map((item) => <Link className={item === active ? styles.active : ""} href={hrefFor(role, item)} key={item}>{item}</Link>)}
        </nav>
        <div className={styles.sidebarFooter}>
          <strong>{roleLabels[role]}</strong>
          <span>{role === "store_manager" ? "OUT010 · Fresh" : role === "dispatcher" || role === "loader" ? "Peliyagoda depot" : "VEH012"}</span>
          <Link href="/sign-in">Sign out</Link>
        </div>
      </aside>}
      <div className={styles.content}>
        <header className={isDriver ? styles.driverHeader : styles.header}>
          <div><strong>{isDriver ? "VEH012 · Trip 1" : role === "store_manager" ? "OUT010 · Fresh outlet" : "Peliyagoda"}</strong><span>{isDriver ? "Wed 25 Mar · Peliyagoda" : role === "store_manager" ? "Colombo · Peliyagoda depot" : "Planning Wed 25 Mar"}</span></div>
          <div className={styles.headerRight}><span className={styles.status}>● Online</span><span>{roleLabels[role]}</span></div>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
      {isDriver && <nav className={styles.bottomNav} aria-label="Driver navigation">{navigation.driver.map((item) => <a className={item === active ? styles.active : ""} href="#" key={item}>{item}</a>)}</nav>}
    </div>
  );
}
