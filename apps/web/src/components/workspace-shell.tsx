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
  if (role === "store_manager" && item === "Order status") return "/workspace/store_manager/status";
  if (role === "store_manager" && item === "History & issues") return "/workspace/store_manager/history";
  if (role === "store_manager" && item === "Notifications") return "/workspace/store_manager/notifications";
  if (role === "store_manager" && item === "Settings") return "/workspace/store_manager/settings";
  if (role === "dispatcher" && item === "Plan") return "/workspace/dispatcher/plan";
  if (role === "dispatcher" && item === "Live Board") return "/workspace/dispatcher/board";
  if (role === "dispatcher" && item === "Needs Attention") return "/workspace/dispatcher/attention";
  if (role === "dispatcher" && item === "Deferral Log") return "/workspace/dispatcher/deferrals";
  if (role === "dispatcher" && item === "Capacity Forecast") return "/workspace/dispatcher/capacity";
  if (role === "dispatcher" && item === "Reference Data") return "/workspace/dispatcher/reference";
  if (role === "loader" && item === "Trip queue") return "/workspace/loader";
  if (role === "loader" && item === "Active load") return "/workspace/loader/load";
  if (role === "loader" && item === "Loading issues") return "/workspace/loader/issues";
  if (role === "driver" && item === "Active trip") return "/workspace/driver/trip";
  if (role === "driver" && item === "Sync") return "/workspace/driver/sync";
  return `/workspace/${role}`;
}

function LoaderIcon({ item }: Readonly<{ item: string }>) {
  const icon = item === "Trip queue" ? "clipboard" : item === "Active load" ? "cube" : "alert";
  return <span aria-hidden="true" className={`${styles.navIcon} ${styles[icon]}`} />;
}

function NavIcon({ item }: Readonly<{ item: string }>) {
  if (item === "Trip queue" || item === "Active load" || item === "Loading issues") return <LoaderIcon item={item} />;
  return <span aria-hidden="true" className={styles.navDot} />;
}

export async function WorkspaceShell({
  role,
  active,
  children
}: Readonly<{ role: UserRole; active: string; children: React.ReactNode }>) {
  const session = await requireRole(role);
  const isDriver = role === "driver";
  const isLoader = role === "loader";
  const isStore = role === "store_manager";
  const isDispatcher = role === "dispatcher";
  const usesNovaSidebar = isLoader || isStore || isDispatcher;

  return (
    <div className={`${isDriver ? styles.driverShell : styles.shell} ${usesNovaSidebar ? styles.novaShell : ""}`}>
      {!isDriver && (
        <aside className={`${styles.sidebar} ${usesNovaSidebar ? styles.novaSidebar : ""} ${isLoader ? styles.loaderSidebar : ""} ${isStore ? styles.storeSidebar : ""} ${isDispatcher ? styles.dispatcherSidebar : ""}`}>
          <Link href="/" className={styles.logo}>
            {usesNovaSidebar ? (
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
                {usesNovaSidebar && <NavIcon item={item} />}
                {item}
              </Link>
            ))}
          </nav>
          <div className={styles.sidebarFooter}>
            <strong>{isLoader || isDispatcher ? "Peliyagoda depot" : isStore ? "OUT010 - Fresh" : session.displayName}</strong>
            <span>
              {isStore
                ? "Colombo - Peliyagoda depot"
                : isDispatcher
                  ? "38 vehicles - 49 Fresh - 16 Style - 10 Tech outlets"
                  : isLoader
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
        <header className={isDriver ? styles.driverHeader : `${styles.header} ${usesNovaSidebar ? styles.novaHeader : ""}`}>
          {usesNovaSidebar ? (
            <>
              <div className={styles.headerSite}>
                <span className={styles.siteIcon} aria-hidden="true" />
                <strong>{isStore ? "OUT010 - Fresh outlet" : "Peliyagoda"}</strong>
                <span>{isStore ? "Colombo - Peliyagoda depot" : isDispatcher ? "Tue 24 Mar 2026 - planning Wed 25 Mar" : "Loading for Wed 25 Mar 2026"}</span>
              </div>
              <div className={styles.headerRight}>
                <span className={styles.status}>{isStore ? "△ Cutoff 16:00 - 20 min left" : isDispatcher ? "◷ Queue closed" : "✓ Online"}</span>
                <span className={styles.bell} aria-label="Notifications" role="img" />
                <span className={styles.avatar}>{isStore ? "SM" : isDispatcher ? "DS" : "LD"}</span>
                <span className={styles.identity}>
                  <strong>{roleLabels[role]}</strong>
                  <small>{isStore ? "Tue 24 Mar - 15:40" : isDispatcher ? "Tue 24 Mar - 16:05" : "Wed 25 Mar - 03:12"}</small>
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
            <Link className={item === active ? styles.active : ""} href={hrefFor("driver", item)} key={item}>
              {item}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
