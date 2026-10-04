"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./section.module.css";

export function StorePreferences({ accountId, locale }: { accountId: string; locale: string }) {
  const [message, setMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(`waypoint-store-preferences-${accountId}`) ?? "null"); if (saved && formRef.current) { for (const name of ["cutoff", "delivery", "issues"]) { const input = formRef.current.elements.namedItem(name) as HTMLInputElement; input.checked = saved[name] === "on"; } const select = formRef.current.elements.namedItem("locale") as HTMLSelectElement; select.value = saved.locale ?? locale; } } catch { /* Use account defaults if storage is unavailable. */ } }, [accountId, locale]);
  return <section className={styles.card}><div className={styles.cardTitle}><div><h2>Ordering preferences</h2><p>Choose the updates this device should highlight while you work.</p></div></div><form className={styles.preferenceForm} ref={formRef} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { localStorage.setItem(`waypoint-store-preferences-${accountId}`, JSON.stringify(Object.fromEntries(data))); setMessage("Preferences saved on this device."); } catch { setMessage("Preferences could not be saved. Please retry."); } }}>
    <label className={styles.toggleRow}><span>Cutoff reminders<small>Show reminders before the daily order cutoff.</small></span><input name="cutoff" type="checkbox" defaultChecked /></label>
    <label className={styles.toggleRow}><span>Delivery updates<small>Prioritize status changes for confirmed and in-transit orders.</small></span><input name="delivery" type="checkbox" defaultChecked /></label>
    <label className={styles.toggleRow}><span>Issue updates<small>Keep receipt, damaged, and quantity issue alerts visible.</small></span><input name="issues" type="checkbox" defaultChecked /></label>
    <label className={styles.selectRow}><span>Language preference<small>Used for this manager workspace where supported.</small></span><select name="locale" defaultValue={locale}><option value="en">English</option><option value="si">Sinhala</option><option value="ta">Tamil</option></select></label><button type="submit">Save preferences</button>{message && <p role="status">{message}</p>}
  </form></section>;
}
