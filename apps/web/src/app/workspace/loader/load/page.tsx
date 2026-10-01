import { WorkspaceShell } from "@/components/workspace-shell";
import { LoadChecklist } from "./load-checklist";

export default function LoaderLoadPage() {
  return <WorkspaceShell role="loader" active="Active load"><LoadChecklist /></WorkspaceShell>;
}
