"use client";

import { useActionState, useState } from "react";
import { registerStoreManager } from "./actions";
import styles from "./registration.module.css";

export function RegistrationForm({ depot }: { depot: string }) {
  const [state, action, pending] = useActionState(registerStoreManager, {});
  const [brand, setBrand] = useState("FRESH");
  return <form action={action} className={styles.form}>
    <h2>Register a store manager</h2>
    <p>Each account manages one outlet. New outlets belong to your depot: <strong>{depot}</strong>.</p>
    {state.error && <p role="alert" className={styles.error}>{state.error}</p>}
    {state.success && <p role="status" className={styles.success}>{state.success}</p>}
    <fieldset disabled={pending}><legend>Manager account</legend><div className={styles.fields}>
      <label>Manager name<input name="displayName" required maxLength={100} autoComplete="name" /></label>
      <label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
      <label>Initial password<input name="password" type="password" minLength={12} maxLength={72} required autoComplete="new-password" /><small>At least 12 characters. Share directly with the manager.</small></label>
    </div></fieldset>
    <fieldset disabled={pending}><legend>Outlet and delivery rules</legend><div className={styles.fields}>
      <label>Outlet ID<input name="outletId" required maxLength={40} /><small>For an existing unassigned outlet, its saved delivery rules are retained.</small></label>
      <label>Store type<select name="brand" value={brand} onChange={(event) => setBrand(event.target.value)}><option value="FRESH">Fresh — chilled and dry groceries</option><option value="STYLE">Style — weekly retail deliveries</option><option value="TECH">Tech — high-value and fragile goods</option></select></label>
      <label>District<input name="district" required maxLength={100} /></label>
      <label>Dock type<select name="dockType"><option value="rear_dock">Rear dock</option><option value="street">Street loading</option><option value="mall_dock">Mall dock</option></select></label>
      <label>Vehicle access<select name="parkingConstraint"><option value="normal">Normal access</option><option value="van_only">Van only</option><option value="mall_dock">Mall dock / booked access</option></select></label>
      <label>Window opens<input name="windowOpenTime" type="time" required key={`${brand}-open`} defaultValue={brand === "FRESH" ? "05:00" : "09:00"} /></label>
      <label>Window closes<input name="windowCloseTime" type="time" required key={`${brand}-close`} defaultValue={brand === "FRESH" ? "08:00" : "17:00"} max={brand === "FRESH" ? "08:00" : undefined} /></label>
      <label>Mall access / booking instructions<input name="mallWindow" maxLength={300} /><small>Required for mall outlets. Fresh deliveries must arrive by 08:00.</small></label>
    </div></fieldset>
    <button disabled={pending} type="submit">{pending ? "Registering…" : "Register store manager"}</button>
  </form>;
}
