import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  ChartNoAxesColumnIncreasing,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  LogOut,
  Package,
  Route,
  Settings,
  TriangleAlert,
  Truck,
  type LucideIcon
} from "lucide-react";
import { APP_NAME, roleLabels, type UserRole } from "@waypoint/domain";
import { signOut } from "@/app/sign-in/actions";
import { requireRole } from "@/lib/auth";
import styles from "./workspace-shell.module.css";

const navigation: Record<UserRole, readonly string[]> = {
  store_manager: ["Dashboard", "Place order", "Order status", "Receive", "History & issues", "Notifications"],
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

function NavIcon({ item }: Readonly<{ item: string }>) {
  const iconByItem: Record<string, LucideIcon> = {
    Dashboard: LayoutDashboard,
    "Place order": ClipboardList,
    "Order status": Truck,
    Receive: Package,
    "History & issues": Clock3,
    Notifications: Bell,
    Plan: Route,
    "Live Board": Truck,
    "Needs Attention": TriangleAlert,
    "Deferral Log": Clock3,
    "Capacity Forecast": ChartNoAxesColumnIncreasing,
    "Reference Data": ClipboardList,
    "Trip queue": ClipboardList,
    "Active load": Package,
    "Loading issues": TriangleAlert
  };
  const Icon = iconByItem[item] ?? LayoutDashboard;

  return <Icon aria-hidden="true" className={styles.navIcon} strokeWidth={2} />;
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
                {role === "dispatcher" && item === "Needs Attention"
                    ? "Needs Attention · 3"
                    : item}
              </Link>
            ))}
          </nav>
          <div className={styles.sidebarFooter}>
            <div className={styles.sidebarFooterTitle}>
              <strong>{isLoader || isDispatcher ? "Peliyagoda depot" : isStore ? "OUT010 - Fresh" : session.displayName}</strong>
              {isStore && (
                <Link className={styles.outletSettings} href="/workspace/store_manager/settings" aria-label="Store settings">
                  <Settings aria-hidden="true" />
                </Link>
              )}
            </div>
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
            <button className={styles.signOut} type="submit"><LogOut aria-hidden="true" />Sign out</button>
          </form>
        </aside>
      )}
      <div className={styles.content}>
        {isDriver ? (
          <header className={styles.driverHeader}>
            <div className={styles.driverStatusBar}><span>03:58</span><span>4G&nbsp; ▮ ▮ ▮</span></div>
            <div className={styles.driverTopBar}>
              <div>
                <strong>VEH012 · Trip 1</strong>
                <span>Wed 25 Mar · Peliyagoda</span>
              </div>
              <div className={styles.headerRight}>
                <span className={styles.status}>Up to date</span>
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
                <strong>{isStore ? "OUT010 - Fresh outlet" : "Peliyagoda"}</strong>
                <span>{isStore ? "Colombo - Peliyagoda depot" : isDispatcher ? "Tue 24 Mar 2026 - planning Wed 25 Mar" : "Loading for Wed 25 Mar 2026"}</span>
              </div>
              <div className={styles.headerRight}>
                <span className={`${styles.status} ${isStore ? styles.warningStatus : isDispatcher ? styles.neutralStatus : styles.onlineStatus}`}>
                  {isStore ? "Cutoff 16:00 - 20 min left" : isDispatcher ? "Queue closed" : "Online"}
                </span>
                <span className={styles.bell} aria-label="Notifications" role="img" />
                <span className={styles.avatar}>{isStore ? "SM" : isDispatcher ? "DS" : "LD"}</span>
                <span className={styles.identity}>
                  <strong>{roleLabels[role]}</strong>
                  <small>{isStore ? "Tue 24 Mar - 15:40" : isDispatcher ? "Tue 24 Mar - 16:05" : "Wed 25 Mar - 03:12"}</small>
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
