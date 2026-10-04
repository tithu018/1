import { DriverHeader } from "@/app/workspace/driver/driver-chrome";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  CloudUpload,
  MapPinned,
  UserRound,
  ChartNoAxesColumnIncreasing,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  LogOut,
  Package,
  Route,
  SlidersHorizontal,
  TriangleAlert,
  Truck,
  type LucideIcon
} from "lucide-react";
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
  driver: ["Today", "Active trip", "Sync", "Profile"]
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
  if (role === "driver" && item === "Profile") return "/workspace/driver/profile";
  if (role === "driver" && item === "Sync") return "/workspace/driver/sync";
  return `/workspace/${role}`;
}

function NavIcon({ item }: Readonly<{ item: string }>) {
  const iconByItem: Record<string, LucideIcon> = {
    Dashboard: LayoutDashboard,
    Today: LayoutDashboard,
    "Active trip": MapPinned,
    Sync: CloudUpload,
    Profile: UserRound,
    "Place order": ClipboardList,
    "Order status": Truck,
    Receive: Package,
    "History & issues": Clock3,
    Notifications: Bell,
    Settings: SlidersHorizontal,
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
    <div className={`${isDriver ? styles.driverShell : styles.shell} ${usesNovaSidebar ? styles.novaShell : ""} ${isDispatcher ? styles.dispatcherShell : ""}`}>
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
              <Link className={item === active ? styles.active : ""} href={hrefFor(role, item)} key={item} aria-current={item === active ? "page" : undefined}>
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
            <button className={styles.signOut} type="submit"><LogOut aria-hidden="true" />Sign out</button>
          </form>
        </aside>
      )}
      <div className={styles.content}>
        {isDriver ? (
          <DriverHeader name={session.displayName} depot={depot?.name ?? "No depot assigned"} accountId={session.accountId} />
        ) : (
          <header className={`${styles.header} ${usesNovaSidebar ? styles.novaHeader : ""}`}>
            {usesNovaSidebar ? (
            <>
              <div className={styles.headerSite}>
                <strong>{site}</strong>
                <span>{context}</span>
              </div>
              <div className={styles.headerRight}>
                {!isDispatcher && <>
                  <span className={`${styles.status} ${isStore ? styles.warningStatus : styles.onlineStatus}`}>
                    {isStore ? "Order cutoff 16:00" : roleLabels[role]}
                  </span>
                  <span className={styles.bell} aria-label="Notifications" role="img" />
                </>}
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
        {isDispatcher && <nav className={styles.dispatcherMobileNav} aria-label="Dispatcher mobile navigation">{navigation.dispatcher.map((item) => <Link key={item} href={hrefFor("dispatcher", item)} aria-current={item === active ? "page" : undefined}><NavIcon item={item} />{item}</Link>)}<form action={signOut}><button type="submit"><LogOut size={16} />Sign out</button></form></nav>}
        <main className={styles.main}>{children}</main>
      </div>
      {isDriver && (
        <nav className={styles.bottomNav} aria-label="Driver navigation">
          {navigation.driver.map((item) => (
            <Link className={item === active ? styles.active : ""} href={hrefFor("driver", item)} key={item} aria-current={item === active ? "page" : undefined}>
              <NavIcon item={item} />{item}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
