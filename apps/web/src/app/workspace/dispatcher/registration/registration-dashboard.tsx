"use client";

import { useActionState, useState } from "react";
import { RegistrationForm } from "./registration-form";
import { registerStaff, registerVehicle, setAccountActive, setVehicleWorkshop, resetStaffPassword } from "./actions";
import styles from "./registration.module.css";

type Account = { id: string; displayName: string; email: string; role: string; outletId: string | null; depotId: string | null; isActive: boolean };
type Vehicle = { id: string; depotId: string; type: string; temperature: string; weight: number; volume: number; isInWorkshop: boolean };
function Feedback({ state }: { state: { error?: string; success?: string } }) {
  return <>{state.error && <p className={styles.error} role="alert">{state.error}</p>}{state.success && <p className={styles.success} role="status">{state.success}</p>}</>;
}
function AccountToggle({ account, currentAccountId }: { account: Account; currentAccountId: string }) {
  const [state, action, pending] = useActionState(setAccountActive, {});
  return <form action={action}><input type="hidden" name="accountId" value={account.id} /><input type="hidden" name="isActive" value={String(!account.isActive)} /><button disabled={pending || account.id === currentAccountId}>{account.isActive ? "Deactivate" : "Activate"}</button><Feedback state={state} /></form>;
}
function PasswordReset({ account }: { account: Account }) {
  const [state, action, pending] = useActionState(resetStaffPassword, {});
  return <details><summary>Reset password</summary><form action={action}><input type="hidden" name="accountId" value={account.id} /><input name="password" type="password" aria-label={`New password for ${account.displayName}`} autoComplete="new-password" minLength={12} maxLength={72} required /><button disabled={pending}>Reset</button><Feedback state={state} /></form></details>;
}
function WorkshopToggle({ vehicle }: { vehicle: Vehicle }) {
  const [state, action, pending] = useActionState(setVehicleWorkshop, {});
  return <form action={action}><input type="hidden" name="vehicleId" value={vehicle.id} /><input type="hidden" name="isInWorkshop" value={String(!vehicle.isInWorkshop)} /><button disabled={pending}>{vehicle.isInWorkshop ? "Mark available" : "Send to workshop"}</button><Feedback state={state} /></form>;
}
function StaffForm({ depot }: { depot: string }) {
  const [state, action, pending] = useActionState(registerStaff, {});
  return <form className={styles.form} action={action}><h2>Register staff · {depot}</h2><Feedback state={state} /><input type="hidden" name="depotId" value={depot} /><fieldset disabled={pending}><div className={styles.fields}>
    <label>Name<input name="displayName" required maxLength={100} autoComplete="name" /></label>
    <label>Email<input name="email" type="email" required autoComplete="email" /></label>
    <label>Role<select name="role"><option value="DRIVER">Driver</option><option value="LOADER">Loader</option><option value="DISPATCHER">Dispatcher</option></select></label>
    <label>Initial password<input name="password" type="password" required minLength={12} maxLength={72} autoComplete="new-password" /><small>Minimum 12 characters.</small></label>
  </div></fieldset><button disabled={pending}>{pending ? "Registering…" : "Register staff"}</button></form>;
}
function VehicleForm({ depot }: { depot: string }) {
  const [state, action, pending] = useActionState(registerVehicle, {});
  return <form className={styles.form} action={action}><h2>Register vehicle · {depot}</h2><Feedback state={state} /><input type="hidden" name="depotId" value={depot} /><fieldset disabled={pending}><div className={styles.fields}>
    <label>Vehicle ID<input name="vehicleId" required maxLength={40} /></label><label>Type<select name="type"><option value="TRUCK">Truck</option><option value="VAN">Van</option></select></label>
    <label>Temperature<select name="temperature"><option value="AMBIENT">Ambient</option><option value="REEFER">Reefer</option></select></label>
    <label>Weight capacity (kg)<input name="weight" type="number" min="0.01" step="0.01" required /></label>
    <label>Volume capacity (m³)<input name="volume" type="number" min="0.001" step="0.001" required /></label>
    <label>Fuel efficiency (km/L)<input name="efficiency" type="number" min="0.001" step="0.001" required /></label>
    <label>Weekly fuel quota (L)<input name="quota" type="number" min="0.01" step="0.01" required /></label>
  </div></fieldset><button disabled={pending}>{pending ? "Registering…" : "Register vehicle"}</button></form>;
}
export function RegistrationDashboard({ ownDepot, depots, districts, currentAccountId, accounts, vehicles }: { ownDepot: string; depots: Array<{ id: string; name: string }>; districts: Record<string, string[]>; currentAccountId: string; accounts: Account[]; vehicles: Vehicle[] }) {
  const [tab, setTab] = useState("stores");
  const [depot, setDepot] = useState(ownDepot);
  const depotVehicles = vehicles.filter((vehicle) => vehicle.depotId === depot);
  const visibleAccounts = accounts.filter((account) => account.depotId === depot && (tab === "stores" ? account.role === "STORE_MANAGER" : account.role !== "STORE_MANAGER"));
  return <section className={styles.page}><header><h1>Registration</h1><p>Register store managers, staff and vehicles for either depot.</p></header>
    <label className={styles.depotBar}>Depot<select value={depot} onChange={(event) => setDepot(event.target.value)}>{depots.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{entry.id === ownDepot ? " (your depot)" : ""}</option>)}</select><small>New registrations and the lists below use this depot.</small></label>
    <div className={styles.tabs} role="tablist" aria-label="Registration type">{[["stores", "Store managers"], ["staff", "Staff"], ["vehicles", "Vehicles"]].map(([key, title]) => <button key={key} role="tab" aria-selected={tab === key} aria-controls={`registration-${key}`} onClick={() => setTab(key)}>{title}</button>)}</div>
    <div id={`registration-${tab}`} role="tabpanel" className={styles.page}>
      {tab === "stores" ? <RegistrationForm key={depot} depot={depot} districts={districts[depot] ?? []} /> : tab === "staff" ? <StaffForm key={depot} depot={depot} /> : <VehicleForm key={depot} depot={depot} />}
      <section className={styles.card}><h2>{tab === "vehicles" ? "Vehicles" : "Accounts"} · {depot}</h2><div className={styles.table}>{tab === "vehicles" ? <table><thead><tr><th>Vehicle</th><th>Type</th><th>Temperature</th><th>Weight</th><th>Volume</th><th>Status</th><th /></tr></thead><tbody>{depotVehicles.map((vehicle) => <tr key={vehicle.id}><td>{vehicle.id}</td><td>{vehicle.type}</td><td>{vehicle.temperature}</td><td>{vehicle.weight} kg</td><td>{vehicle.volume} m³</td><td>{vehicle.isInWorkshop ? "In workshop" : "Available"}</td><td><WorkshopToggle vehicle={vehicle} /></td></tr>)}</tbody></table> : <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Outlet</th><th>Status</th><th /></tr></thead><tbody>{visibleAccounts.map((account) => <tr key={account.id}><td>{account.displayName}</td><td>{account.email}</td><td>{account.role.replaceAll("_", " ")}</td><td>{account.outletId ?? "—"}</td><td>{account.isActive ? "Active" : "Inactive"}</td><td><AccountToggle account={account} currentAccountId={currentAccountId} />{account.id !== currentAccountId && <PasswordReset account={account} />}</td></tr>)}</tbody></table>}</div>{(tab === "vehicles" ? !depotVehicles.length : !visibleAccounts.length) && <p>No records.</p>}</section>
    </div>
  </section>;
}
