"use client";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import styles from "./[section]/section.module.css";

export function DispatcherRefresh({ live = false }: { live?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 30000);
    return () => clearInterval(timer);
  }, [live, router]);
  return <button className={styles.refresh} disabled={pending} onClick={() => startTransition(() => router.refresh())}><RefreshCw size={16} />{pending ? "Refreshing…" : "Refresh"}{live && <small> · every 30s</small>}</button>;
}
