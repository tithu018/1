"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignTripDriver } from "./actions";

export function DriverAssignment({ tripId, driverId, drivers }: { tripId: string; driverId: string | null; drivers: Array<{ id: string; displayName: string }> }) {
  const router = useRouter();
  const [selected, setSelected] = useState(driverId ?? ""), [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null);
  return <form onSubmit={async (event) => { event.preventDefault(); setPending(true); setError(null); try { await assignTripDriver(tripId, selected); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Assignment failed."); } finally { setPending(false); } }}>
    <select aria-label="Assigned driver" value={selected} onChange={(event) => setSelected(event.target.value)} disabled={pending}><option value="">Choose driver</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.displayName}</option>)}</select>
    <button disabled={pending || !selected || selected === driverId}>{pending ? "Saving…" : "Assign"}</button>{error && <p role="alert">{error}</p>}
  </form>;
}
