import { WorkspaceShell } from "@/components/workspace-shell";
import { IssuesPanel } from "./issues-panel";

export default function LoadingIssuesPage() {
  return (
    <WorkspaceShell role="loader" active="Loading issues">
      <IssuesPanel />
    </WorkspaceShell>
  );
}
