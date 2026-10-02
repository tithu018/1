import { WorkspaceShell } from "@/components/workspace-shell";
import { DriverSettings } from "./settings-client";

export default function DriverSettingsPage() {
  return <WorkspaceShell role="driver" active=""><DriverSettings /></WorkspaceShell>;
}
