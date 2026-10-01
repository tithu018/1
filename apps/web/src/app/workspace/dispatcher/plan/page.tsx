import { WorkspaceShell } from "@/components/workspace-shell";
import { DispatcherPlan } from "./planner";

export default function DispatcherPlanPage() {
  return <WorkspaceShell role="dispatcher" active="Plan"><DispatcherPlan /></WorkspaceShell>;
}
