import { WorkspaceShell } from "@/components/workspace-shell";
import { DriverTrip } from "./trip";

export default function DriverTripPage() {
  return <WorkspaceShell role="driver" active="Active trip"><DriverTrip /></WorkspaceShell>;
}
