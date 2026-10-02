import { WorkspaceShell } from "@/components/workspace-shell";
import { DriverSettings } from "./settings-client";
import { requireRole } from "@/lib/auth";

export default async function DriverSettingsPage() {
  const session = await requireRole("driver");
  return <WorkspaceShell role="driver" active=""><DriverSettings displayName={session.displayName} depot={session.depotId ?? "No depot assigned"} /></WorkspaceShell>;
}
