"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CloudUpload, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { readPending } from "@/lib/driver-offline";
import styles from "@/components/workspace-shell.module.css";
import ui from "./driver.module.css";

export function DriverHeader({ name, depot, accountId }: { name: string; depot: string; accountId: string }) {
  const [online, setOnline] = useState<boolean | null>(null), [pending, setPending] = useState(0);
  useEffect(() => {
    const update = () => { setOnline(navigator.onLine); setPending(readPending(accountId).length); };
    const timer = setTimeout(update, 0);
    for (const event of ["online", "offline", "storage", "waypoint-pending-changed"]) window.addEventListener(event, update);
    return () => { clearTimeout(timer); for (const event of ["online", "offline", "storage", "waypoint-pending-changed"]) window.removeEventListener(event, update); };
  }, [accountId]);
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("");
  return <header className={styles.driverHeader}><div className={styles.driverTopBar}>
    <Link href="/workspace/driver" className={styles.driverBrand}><Image src="/Image/logo-green-hq.png" alt="" width={52} height={32} /><div><strong>Waypoint</strong><small>{depot}</small></div></Link>
    <div className={styles.driverTools}><Link href="/workspace/driver/sync" className={styles.driverConnection} aria-label={pending ? `${pending} records pending sync` : online === false ? "Offline. Review sync." : "Review sync"}>{pending ? <CloudUpload /> : online === false ? <WifiOff /> : <Wifi />}<span>{pending ? `${pending} pending` : online === null ? "Sync" : online ? "Online" : "Offline"}</span></Link><Link href="/workspace/driver/profile" className={styles.driverAvatar} aria-label={`${name}'s profile`}>{initials}</Link></div>
  </div></header>;
}
export function RefreshDriver() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return <button className={ui.roundButton} aria-label="Refresh driver workspace" disabled={busy} onClick={() => { setBusy(true); router.refresh(); setTimeout(() => setBusy(false), 700); }}><RefreshCw size={18} /></button>;
}
export function ProfileLink() { return <Link className={ui.quickAction} href="/workspace/driver/profile">My profile<ArrowUpRight /></Link>; }
