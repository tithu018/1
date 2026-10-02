import { WorkspaceShell } from "@/components/workspace-shell";
import { DriverSyncClient } from "./sync-client";

export default function DriverSyncPage() {
  return <WorkspaceShell role="driver" active="Sync"><DriverSyncClient /></WorkspaceShell>;
}
