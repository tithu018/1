"use client";
import { useActionState } from "react";
import { Check, KeyRound, Save } from "lucide-react";
import { changeDriverPassword, updateDriverProfile } from "./actions";
import styles from "../driver.module.css";

export function DriverProfileForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateDriverProfile, {});
  return <form action={action} className={styles.form}><label>Display name<input name="displayName" defaultValue={name} required maxLength={100} autoComplete="name" /></label><button className={styles.primary} disabled={pending}><Save />{pending ? "Saving…" : "Save name"}</button>{state.error && <p className={styles.error} role="alert">{state.error}</p>}{state.success && <p className={styles.notice} role="status"><Check />{state.success}</p>}</form>;
}
export function DriverPasswordForm() {
  const [state, action, pending] = useActionState(changeDriverPassword, {});
  return <form action={action} className={styles.form}><label>Current password<input name="currentPassword" type="password" required autoComplete="current-password" /></label><label>New password<input name="password" type="password" minLength={12} maxLength={72} required autoComplete="new-password" /><small>Minimum 12 characters.</small></label><label>Confirm new password<input name="confirmation" type="password" minLength={12} maxLength={72} required autoComplete="new-password" /></label><button className={styles.primary} disabled={pending}><KeyRound />{pending ? "Updating…" : "Change password"}</button>{state.error && <p className={styles.error} role="alert">{state.error}</p>}{state.success && <p className={styles.notice} role="status"><Check />{state.success}</p>}</form>;
}
