import { WorkspaceShell } from "@/components/workspace-shell";
import { FreshOrderForm } from "./order-form";

export default function PlaceOrderPage() {
  return <WorkspaceShell role="store_manager" active="Place order"><FreshOrderForm /></WorkspaceShell>;
}
