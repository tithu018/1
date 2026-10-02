import Image from "next/image";
import Link from "next/link";
import { APP_NAME, roleLabels, type UserRole } from "@waypoint/domain";
import { signOut } from "@/app/sign-in/actions";
import { requireRole } from "@/lib/auth";
import styles from "./workspace-shell.module.css";

const navigation: Record<UserRole, readonly string[]> = {
  store_manager: ["Dashboard", "Place order", "Order status", "Receive", "History & issues", "Notifications", "Settings"],
  dispatcher: ["Plan", "Live Board", "Needs Attention", "Deferral Log", "Capacity Forecast", "Reference Data"],
  loader: ["Trip queue", "Active load", "Loading issues"],
  driver: ["Today", "Active trip", "Sync"]
};

function hrefFor(role: UserRole, item: string) {
  if (role === "store_manager" && item === "Place order") return "/workspace/store_manager/orders";
  if (role === "store_manager" && item === "Receive") return "/workspace/store_manager/receive";
  if (role === "dispatcher" && item === "Plan") return "/workspace/dispatcher/plan";
  if (role === "loader" && item === "Trip queue") return "/workspace/loader";
  if (role === "loader" && item === "Active load") return "/workspace/loader/load";
  if (role === "loader" && item === "Loading issues") return "/workspace/loader/issues";
  if (role === "driver" && item === "Active trip") return "/workspace/driver/trip";
  return `/workspace/${role}`;
}

function LoaderIcon({ item }: Readonly<{ item: string }>) {
  const icon = item === "Trip queue" ? "clipboard" : item === "Active load" ? "cube" : "alert";
  return <span aria-hidden="true" className={`${styles.navIcon} ${styles[icon]}`} />;
}

export async function WorkspaceShell({
  role,
  active,
  children
}: Readonly<{ role: UserRole; active: string; children: React.ReactNode }>) {
  const session = await requireRole(role);
  const isDriver = role === "driver";
  const isLoader = role === "loader";

  return (
    <div className={`${isDriver ? styles.driverShell : styles.shell} ${isLoader ? styles.loaderShell : ""}`}>
      {!isDriver && (
        <aside className={`${styles.sidebar} ${isLoader ? styles.loaderSidebar : ""}`}>
          <Link href="/" className={styles.logo}>
            {isLoader ? (
              <>
                <Image src="/Image/logo-white.png" alt="" width={47} height={32} priority />
                <span className={styles.logoText}>{APP_NAME}</span>
              </>
            ) : (
              <>
                <span>W</span>
                {APP_NAME}
              </>
            )}
          </Link>
          <nav aria-label={`${roleLabels[role]} navigation`}>
            {navigation[role].map((item) => (
              <Link className={item === active ? styles.active : ""} href={hrefFor(role, item)} key={item}>
                {isLoader && <LoaderIcon item={item} />}
                {item}
              </Link>
            ))}
          </nav>
          <div className={styles.sidebarFooter}>
            <strong>{isLoader ? "Peliyagoda depot" : session.displayName}</strong>
            <span>
              {role === "store_manager"
                ? "OUT010 - Fresh"
                : role === "dispatcher" || role === "loader"
                  ? "Loading dock - shared terminal"
                  : "VEH012"}
            </span>
          </div>
          <form action={signOut} className={styles.signOutForm}>
            <button className={styles.signOut} type="submit">
              Sign out
            </button>
          </form>
        </aside>
      )}
      <div className={styles.content}>
        <header className={isDriver ? styles.driverHeader : `${styles.header} ${isLoader ? styles.loaderHeader : ""}`}>
          {isLoader ? (
            <>
              <div className={styles.headerSite}>
                <span className={styles.siteIcon} aria-hidden="true" />
                <strong>Peliyagoda</strong>
                <span>Loading for Wed 25 Mar 2026</span>
              </div>
              <div className={styles.headerRight}>
                <span className={styles.status}>✓ Online</span>
                <span className={styles.bell} aria-label="Notifications" role="img" />
                <span className={styles.avatar}>LD</span>
                <span className={styles.identity}>
                  <strong>Loader</strong>
                  <small>Wed 25 Mar - 03:12</small>
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                <strong>{isDriver ? "VEH012 - Trip 1" : role === "store_manager" ? "OUT010 - Fresh outlet" : "Peliyagoda"}</strong>
                <span>{isDriver ? "Wed 25 Mar - Peliyagoda" : role === "store_manager" ? "Colombo - Peliyagoda depot" : "Planning Wed 25 Mar"}</span>
              </div>
              <div className={styles.headerRight}>
                <span className={styles.status}>Online</span>
                <span>{roleLabels[role]}</span>
              </div>
            </>
          )}
        </header>
        <main className={styles.main}>{children}</main>
      </div>
      {isDriver && (
        <nav className={styles.bottomNav} aria-label="Driver navigation">
          {navigation.driver.map((item) => (
            <a className={item === active ? styles.active : ""} href="#" key={item}>
              {item}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
