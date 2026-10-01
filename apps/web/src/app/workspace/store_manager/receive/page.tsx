import { WorkspaceShell } from "@/components/workspace-shell";
import { ReceiptConfirmation } from "./receipt-confirmation";

export default function ReceivePage() {
  return <WorkspaceShell role="store_manager" active="Receive"><ReceiptConfirmation /></WorkspaceShell>;
}
