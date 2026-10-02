import Image from "next/image";
import Link from "next/link";
import { APP_NAME, roleLabels, type UserRole } from "@waypoint/domain";
import { signOut } from "@/app/sign-in/actions";
import { requireRole } from "@/lib/auth";
import { prisma } from "@waypoint/database";
import { displayDate, label } from "@/lib/format";
import styles from "./workspace-shell.module.css";

const navigation: Record<UserRole, readonly string[]> = {
  store_manager: ["Dashboard", "Place order", "Order status", "Receive", "History & issues", "Notifications", "Settings"],
  dispatcher: ["Plan", "Registration", "Live Board", "Needs Attention", "Deferral Log", "Capacity Forecast", "Reference Data"],
  loader: ["Trip queue", "Active load", "Loading issues"],
  driver: ["Today", "Active trip", "Sync"]
};

function hrefFor(role: UserRole, item: string) {
  if (role === "dispatcher" && item === "Registration") return "/workspace/dispatcher/registration";
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

  const iconByItem: Record<string, string> = {
    Dashboard: "gridIcon",
    "Place order": "clipboard",
    "Order status": "truckIcon",
    Receive: "cube",
    "History & issues": "historyIcon",
    Notifications: "bellIcon",
    Settings: "slidersIcon",
    Plan: "routeIcon",
    "Live Board": "truckIcon",
    "Needs Attention": "alert",
    "Deferral Log": "historyIcon",
    "Capacity Forecast": "chartIcon",
    "Reference Data": "clipboard"
  };

  return <span aria-hidden="true" className={`${styles.navIcon} ${styles[iconByItem[item] ?? "gridIcon"]}`} />;
}

export async function WorkspaceShell({
  role,
  active,
  children
}: Readonly<{ role: UserRole; active: string; children: React.ReactNode }>) {
  const session = await requireRole(role);
  const outlet = session.outletId ? await prisma.outlet.findUnique({ where: { id: session.outletId }, include: { depot: true } }) : null;
  const depot = session.depotId ? await prisma.depot.findUnique({ where: { id: session.depotId } }) : outlet?.depot;
  const site = outlet ? `${outlet.id} · ${label(outlet.brand)}` : depot?.name ?? "No depot assigned";
  const context = outlet ? `${outlet.district} · ${outlet.depot.name}` : displayDate();
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
                <Image src="/Image/logo-white-hq.png" alt="" width={66} height={36} priority />
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
            <strong>{site}</strong>
            <span>
              {context}
            </span>
          </div>
          <form action={signOut} className={styles.signOutForm}>
            <button className={styles.signOut} type="submit">Sign out</button>
          </form>
        </aside>
      )}
      <div className={styles.content}>
        {isDriver ? (
          <header className={styles.driverHeader}>
            <div className={styles.driverTopBar}>
              <div>
                <strong>{session.displayName}</strong>
                <span>{context}</span>
              </div>
              <div className={styles.headerRight}>
                <Link className={styles.status} href="/workspace/driver/sync">Sync records</Link>
                <Link className={styles.driverSettings} href="/workspace/driver/settings" aria-label="Driver settings"><span aria-hidden="true" /></Link>
              </div>
            </div>
          </header>
        ) : (
          <header className={`${styles.header} ${usesNovaSidebar ? styles.novaHeader : ""}`}>
            {usesNovaSidebar ? (
            <>
              <div className={styles.headerSite}>
                <span className={styles.siteIcon} aria-hidden="true" />
                <strong>{site}</strong>
                <span>{context}</span>
              </div>
              <div className={styles.headerRight}>
                <span className={`${styles.status} ${isStore ? styles.warningStatus : isDispatcher ? styles.neutralStatus : styles.onlineStatus}`}>
                  {isStore ? "Order cutoff 16:00" : roleLabels[role]}
                </span>
                <span className={styles.bell} aria-label="Notifications" role="img" />
                <span className={styles.avatar}>{isStore ? "SM" : isDispatcher ? "DS" : "LD"}</span>
                <span className={styles.identity}>
                  <strong>{session.displayName}</strong>
                  <small>{displayDate()}</small>
                </span>
              </div>
            </>
            ) : null}
          </header>
        )}
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
